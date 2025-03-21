from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
import dotenv
import jwt
import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, LargeBinary, String
#Database imports
from database import engine, Base, get_db, SessionLocal
from models import User, GradedSubmission
from fastapi.middleware.cors import CORSMiddleware
import requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from helpers import get_user_name_and_email, grade_assignment_contents, download_file
from docx import Document  # Importing Document from python-docx to handle Word documents
from rubric_extractor import parse_rubric
import uuid
import io
import googleapiclient.http
from typing import Optional, List
# Create database tables if they don't exist
Base.metadata.create_all(bind=engine)



app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],  # Adjust based on your frontend's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
dotenv.load_dotenv()


GOOGLE_CLIENT_ID = os.getenv("VITE_GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
PG_SECRET = os.getenv("PG_SECRET")
class TokenData(BaseModel):
    token: str

class AuthCodeData(BaseModel):
    code: str

# Function to create a JWT token for session management
def create_jwt_token(user_info: dict) -> str:
    payload = {
        "sub": user_info.get("sub"),
        "email": user_info.get("email"),
        "name": user_info.get("name"),
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=2)  # Token valid for 2 hours
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

@app.post("/auth/google")
async def google_auth(data: TokenData, db: Session = Depends(get_db)):
    try:
        # Verify token with Google
        user_info = id_token.verify_oauth2_token(data.token, google_requests.Request(), GOOGLE_CLIENT_ID)
        # Check if the user already exists in your database
        user = db.query(User).filter(User.email == user_info["email"]).first()
         # Get the current time
        now = datetime.datetime.now(datetime.timezone.utc)
        if not user:
            # If not, create a new user record
            user = User(email=user_info["email"], name=user_info.get("name"), last_login=now)
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update the last login time
            user.last_login = now
            db.commit()
        # Create a JWT token for the user
        jwt_token = create_jwt_token(user_info)
        return {"message": "User authenticated", "user": user_info, "token": jwt_token}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

@app.post("/auth/google/code")
async def google_code_exchange(data: AuthCodeData, db: Session = Depends(get_db)):
    # Exchange authorization code for tokens
    token_endpoint = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": data.code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    token_response = requests.post(token_endpoint, data=token_data)
    if token_response.status_code != 200:
        raise HTTPException(status_code=token_response.status_code, detail=token_response.text)
    tokens = token_response.json()
    
    # Verify the ID token received from the exchange
    id_token_str = tokens.get("id_token")
    if not id_token_str:
        raise HTTPException(status_code=400, detail="ID token not found in response")
    try:
        user_info = id_token.verify_oauth2_token(id_token_str, google_requests.Request(), GOOGLE_CLIENT_ID)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid ID token: {str(e)}")
    access_token = tokens.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Access token not found in response")
    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token not found in response")
    now = datetime.datetime.now(datetime.timezone.utc)
    user = db.query(User).filter(User.email == user_info["email"]).first()
    if not user:
        user = User(email=user_info["email"], 
                    name=user_info.get("name"), 
                    last_login=now, 
                    access_token=cast(func.pgp_sym_encrypt(access_token, PG_SECRET), LargeBinary), 
                    refresh_token=cast(func.pgp_sym_encrypt(refresh_token, PG_SECRET), LargeBinary))
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.last_login = now
        user.access_token = cast(func.pgp_sym_encrypt(access_token, PG_SECRET), LargeBinary)
        user.refresh_token = cast(func.pgp_sym_encrypt(refresh_token, PG_SECRET), LargeBinary)
        db.commit()

    jwt_token = create_jwt_token(user_info)
    return {"message": "User authenticated", "user": user_info, "token": jwt_token, "google_tokens": tokens}
#Get the courses for a given user
@app.get("/classroom/courses")
def get_classroom_courses(email: str, db: Session = Depends(get_db)):
    # Retrieve user from the DB
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Decrypt tokens
    decrypted_access_token = db.query(
        cast(func.pgp_sym_decrypt(User.access_token, PG_SECRET), String)
    ).filter(User.id == user.id).scalar()
    
    decrypted_refresh_token = db.query(
        cast(func.pgp_sym_decrypt(User.refresh_token, PG_SECRET), String)
    ).filter(User.id == user.id).scalar()
    
    if not decrypted_access_token:
        raise HTTPException(status_code=400, detail="Access token could not be decrypted")
    
    # Create credentials
    creds = Credentials(
        token=decrypted_access_token,
        refresh_token=decrypted_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
    )
    
    # Build Classroom service
    try:
        service = build('classroom', 'v1', credentials=creds)
        courses_response = service.courses().list().execute()
        courses = courses_response.get("courses", [])
        # get the course name, id, section, room
        courses_list = []
        for course in courses:
            course_name = course.get("name")
            course_id = course.get("id")
            course_section = course.get("section")
            course_room = course.get("room")
            courses_list.append({
                "name": course_name,
                "id": course_id,
                "section": course_section,
                "room": course_room
            })
        return {"courses": courses_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error accessing Classroom API: {e}")

#Need an endpoint to get the assignments for a given course id
@app.get("/classroom/assignments")
def get_classroom_assignments(email: str, course_id: str, db: Session = Depends(get_db)):
    # Retrieve user from the DB
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found") 
    
    # Decrypt tokens
    decrypted_access_token = db.query(
        cast(func.pgp_sym_decrypt(User.access_token, PG_SECRET), String)
    ).filter(User.id == user.id).scalar()
    
    decrypted_refresh_token = db.query(
        cast(func.pgp_sym_decrypt(User.refresh_token, PG_SECRET), String)
    ).filter(User.id == user.id).scalar()
    
    if not decrypted_access_token:
        raise HTTPException(status_code=400, detail="Access token could not be decrypted")
    
    # Create credentials
    creds = Credentials(
        token=decrypted_access_token,
        refresh_token=decrypted_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
    )

    # Build Classroom service
    try:
        service = build('classroom', 'v1', credentials=creds)
        assignments_response = service.courses().courseWork().list(courseId=course_id).execute()
        assignments = assignments_response.get("courseWork", [])
        #get the assignment title, id, due date, max points
        assignments_list = []
        for assignment in assignments:
            assignment_title = assignment.get("title")
            assignment_id = assignment.get("id")
            assignment_due_date = assignment.get("dueDate")
            if assignment_due_date:
                # Break the due date into year-month-day
                assignment_due_date = f"{assignment_due_date.get('year')}-{assignment_due_date.get('month')}-{assignment_due_date.get('day')}"
            else: #if there is no due date, set it to "No due date"
                assignment_due_date = "No due date"
            assignment_max_points = assignment.get("maxPoints")
            assignments_list.append({
                "title": assignment_title,
                "id": assignment_id,
                "due_date": assignment_due_date,
                "max_points": assignment_max_points
            })
        return {"assignments": assignments_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error accessing Classroom API: {e}")  

#Get the submissions for a given assignment id
@app.get("/classroom/submissions")
def get_classroom_submissions(email: str, assignment_id: str, course_id: str, db: Session = Depends(get_db)):
    # Retrieve user from the DB
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found") 
    
    # Decrypt tokens
    decrypted_access_token = db.query(
        cast(func.pgp_sym_decrypt(User.access_token, PG_SECRET), String)
    ).filter(User.id == user.id).scalar()
    
    decrypted_refresh_token = db.query(
        cast(func.pgp_sym_decrypt(User.refresh_token, PG_SECRET), String)
    ).filter(User.id == user.id).scalar()
    
    if not decrypted_access_token:
        raise HTTPException(status_code=400, detail="Access token could not be decrypted")
    
    # Create credentials
    creds = Credentials(
        token=decrypted_access_token,
        refresh_token=decrypted_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
    )

    # Build Classroom service
    try:
        service = build('classroom', 'v1', credentials=creds)
        submissions = []  # Initialize submissions list outside the loop
        page_token = None  # Initialize page token for pagination
        submissions_list = []  # Initialize submissions_list outside the loop
        assignment_name = service.courses().courseWork().get(courseId=course_id, id=assignment_id).execute().get('title', 'Unknown Assignment')
        while True:
            # Call the Classroom API to list student submissions for the specified coursework
            submission_response = service.courses().courseWork().studentSubmissions().list(
                courseId=course_id,
                courseWorkId=assignment_id,
                pageToken=page_token
            ).execute()
            submissions.extend(submission_response.get('studentSubmissions', []))  # Add submissions to the list
            page_token = submission_response.get('nextPageToken')  # Get the next page token
            if not page_token:
                break  # Exit the loop if there are no more pages
           
            #submissions = submission_response.get("submissions", [])
        if not submissions:
            return {"message": "No submissions found", "assignment_name": assignment_name, "submissions": []}

        for submission in submissions:
            user_id = submission.get('userId', 'Unknown')  # Get the user ID with default
            student_name, student_email = get_user_name_and_email(service, user_id)  # Get the user's name
            submission_data = {
                "student_name": student_name,
                "student_email": student_email,
                "submission_id": submission.get('id', 'Unknown'),
                "submission_title": submission.get("assignmentSubmission", {}).get("attachments", [{}])[0].get("driveFile", {}).get("title", "No title"),
                "submission_link": submission.get("assignmentSubmission", {}).get("attachments", [{}])[0].get("driveFile", {}).get("alternateLink", "No link"),
                "submission_date": submission.get("creationTime", "No date"),
                "submission_status": submission.get("state", "No status"),
                "submission_score": submission.get("courseWorkType", "No score")
            }
            submissions_list.append(submission_data)
        return {"assignment_name": assignment_name, "submissions": submissions_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error accessing Classroom API: {e}")
    
#Endpoint to grade each assignment submission
task_status = {}

# Define a Pydantic model for the request body
class GradeSubmissionRequest(BaseModel):
    submission_ids: Optional[List[str]] = None
    rubric: str

@app.post("/classroom/grade_submission")
def grade_submission(
    email: str, 
    assignment_id: str, 
    course_id: str, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db), 
    request: GradeSubmissionRequest = None
):
    submission_ids = request.submission_ids if request else None
    # Generate a unique task ID
    task_id = str(uuid.uuid4())
    task_status[task_id] = "in progress"
    
    # Retrieve user from the DB
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Decrypt tokens
    decrypted_access_token = db.query(
        cast(func.pgp_sym_decrypt(User.access_token, PG_SECRET), String)
    ).filter(User.id == user.id).scalar()
    
    decrypted_refresh_token = db.query(
        cast(func.pgp_sym_decrypt(User.refresh_token, PG_SECRET), String)
    ).filter(User.id == user.id).scalar()
    
    if not decrypted_access_token:
        raise HTTPException(status_code=400, detail="Access token could not be decrypted")
    
    # Create credentials
    creds = Credentials(
        token=decrypted_access_token,
        refresh_token=decrypted_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
    )

    # Add the grading task to the background, passing submission_ids
    background_tasks.add_task(grade_assignment, creds, course_id, assignment_id, task_id, submission_ids=submission_ids, rubric=request.rubric)
    
    return {"message": "Grading in progress", "task_id": task_id}

def grade_assignment(creds, course_id, assignment_id, task_id, submission_ids=None, rubric=None):
    try:
        service = build('classroom', 'v1', credentials=creds)
        
        # Build the Drive API service
        drive_service = build('drive', 'v3', credentials=creds)
        
        # Get file metadata to determine MIME type
        file_metadata = drive_service.files().get(fileId=rubric, fields='mimeType').execute()
        mime_type = file_metadata.get("mimeType")

        # Define the export MIME type if needed
        export_mime_type = None
        if mime_type == "application/vnd.google-apps.spreadsheet":
            # Export Google Sheets as XLSX
            export_mime_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif mime_type == "application/vnd.google-apps.document":
            # Export Google Docs as PDF or Word docx, but for rubric use XLSX might be expected.
            # Adjust accordingly if needed.
            export_mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        # Add other cases if needed

        file_data = io.BytesIO()
        if export_mime_type:
            # Use export_media for Google Docs editors files
            request = drive_service.files().export_media(fileId=rubric, mimeType=export_mime_type)
        else:
            # For non-Google Docs files (already binary), use get_media
            request = drive_service.files().get_media(fileId=rubric)
            
        downloader = googleapiclient.http.MediaIoBaseDownload(file_data, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
            print(f"Download {int(status.progress() * 100)}%.")
        
        # Reset the pointer to the beginning of the BytesIO object
        file_data.seek(0)
        # Get the rubric
        print(f"File data: {file_data}")
        rubric = parse_rubric(file_data)
        
        # Grade the submission
        graded_submissions = grade_assignment_contents(
            service, 
            course_id, 
            assignment_id, 
            rubric, 
            creds, 
            submission_ids=submission_ids  # Pass the submission_ids to the grading function
        )
        # Obtain a valid database session:
        with SessionLocal() as db_session:
            store_graded_results(graded_submissions, db_session)
        # Update task status
        task_status[task_id] = "completed"
    except Exception as e:
        # Update task status on failure
        task_status[task_id] = f"failed: {e}"
        print(f"Error accessing Classroom API: {e}")

@app.get("/classroom/task_status/{task_id}")
def get_task_status(task_id: str):
    status = task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task_id": task_id, "status": status}
    
def store_graded_results(graded_results, db_session, graded_by_id=None):
    # The first item contains assignment-level data.
    assignment_info = graded_results[0]
    assignment_id = assignment_info.get("assignment_id")
    assignment_name = assignment_info.get("assignment_name")
    
    # Loop over the student results (skipping the first item)
    for student_result in graded_results[1:]:
        student_name = student_result.get("student")
        submission_id = student_result.get("submission_id")
        grade_results = student_result.get("grade_result", {})
        points_received = grade_results.get("points_received")
        points_possible = grade_results.get("points_possible")
        rubric_breakdown = grade_results.get("rubric_breakdown")
        explanation = grade_results.get("explanation")
        
        #print(f"Student Result: {student_result}")
        
        # Create a new graded submission record
        record = GradedSubmission(
            assignment_id=assignment_id,
            assignment_name=assignment_name,
            student_name=student_name,
            points_received=points_received,
            points_possible=points_possible,
            rubric_breakdown=str(rubric_breakdown),  # or json.dumps if it's JSON
            explanation=explanation,
            submission_id=submission_id
        )
        db_session.add(record)
    
    db_session.commit()
@app.get("/classroom/graded_submissions")
def get_graded_submissions(submission_id: str, db: Session = Depends(get_db)):
    # Get the latest grading result for the given submission ID
    try:
        submission = db.query(GradedSubmission).filter(GradedSubmission.submission_id == submission_id).order_by(GradedSubmission.graded_at.desc()).first()
        return {"latest_graded_submission": submission}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error accessing database: {e}")
   
   
# Need a secure endpoint to get the decrypted access token and refresh token
@app.get("/classroom/access_token")
def get_access_token(email: str, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        decrypted_access_token = db.query(
            cast(func.pgp_sym_decrypt(User.access_token, PG_SECRET), String)
        ).filter(User.id == user.id).scalar()
        decrypted_refresh_token = db.query(
            cast(func.pgp_sym_decrypt(User.refresh_token, PG_SECRET), String)
        ).filter(User.id == user.id).scalar()
        return {"access_token": decrypted_access_token, "refresh_token": decrypted_refresh_token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error accessing database: {e}")
    

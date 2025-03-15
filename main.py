from fastapi import FastAPI, HTTPException, Depends
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
from database import engine, Base, get_db
from models import User
from fastapi.middleware.cors import CORSMiddleware
import requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
# Create database tables if they don't exist
Base.metadata.create_all(bind=engine)



app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173"],  # Adjust based on your frontend's origin
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
        assignments_response = service.courses().get(courseId=course_id).execute()
        assignments = assignments_response.get("assignments", [])
        return {"assignments": assignments}
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
        submissions_response = service.courses().get(courseId=course_id).execute()
        submissions = submissions_response.get("submissions", [])
        return {"submissions": submissions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error accessing Classroom API: {e}")
    


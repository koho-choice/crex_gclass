#%%
import os.path  # Importing the os.path module to work with file paths

# Importing necessary modules from the Google Auth and API client libraries
from google.auth.transport.requests import Request  # For handling HTTP requests
from google.oauth2.credentials import Credentials  # For managing OAuth2 credentials
from google_auth_oauthlib.flow import InstalledAppFlow  # For handling OAuth2 flow
from googleapiclient.discovery import build  # For building the API client
from googleapiclient.errors import HttpError  # For handling HTTP errors
import io  # Importing io module for handling byte streams
from googleapiclient.http import MediaIoBaseDownload  # For downloading media files
from docx import Document  # Importing Document from python-docx to handle Word documents
import pandas as pd
import requests
from dotenv import load_dotenv
import os
import base64
import json
load_dotenv()

# Defining the scopes for the Google APIs being used
# If modifying these scopes, delete the file token.json.
SCOPES = [
    "https://www.googleapis.com/auth/classroom.courses",  # Access to Classroom courses
    "https://www.googleapis.com/auth/classroom.coursework.students",  # Access to student coursework
    "https://www.googleapis.com/auth/classroom.coursework.me",  # Access to user's coursework
    "https://www.googleapis.com/auth/drive.readonly",  # Read-only access to Google Drive
    "https://www.googleapis.com/auth/classroom.rosters"
]

"""Shows basic usage of the Classroom API.
Prints the names of the first 10 courses the user has access to.
"""
creds = None  # Initialize credentials variable to None
TOKEN_FILE = "token.json"
# Check if the token.json file exists to load existing credentials
# The file token.json stores the user's access and refresh tokens, and is
# created automatically when the authorization flow completes for the first time.
if os.path.exists(TOKEN_FILE):
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)  # Load credentials from file
else:
    # Load credentials from .env (Base64 encoded)
    token_base64 = os.getenv("GOOGLE_TOKEN_BASE64")
    if token_base64:
        token_json = base64.b64decode(token_base64).decode("utf-8")
        creds = Credentials.from_authorized_user_info(json.loads(token_json), SCOPES)
    else:
        raise ValueError("No token found in environment variables")

# If there are no valid credentials, handle authentication
if not creds or not creds.valid:
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())  # Refresh expired credentials
    else:
        # Load credentials from environment variables
        credentials_base64 = os.getenv("GOOGLE_CREDENTIALS_BASE64")
        if credentials_base64:
            credentials_json = base64.b64decode(credentials_base64).decode("utf-8")
            credentials_dict = json.loads(credentials_json)

            # Save decoded JSON to a temporary file
            with open("credentials_temp.json", "w") as temp_file:
                json.dump(credentials_dict, temp_file)

            # Use the temporary file for authentication
            flow = InstalledAppFlow.from_client_secrets_file(
                "credentials_temp.json", SCOPES
            )
            creds = flow.run_local_server(port=0)

            # Remove temporary file after authentication
            os.remove("credentials_temp.json")
     # Save updated credentials back to .env
    if creds:
        token_json = json.dumps(json.loads(creds.to_json()))  # Convert creds to JSON
        token_base64 = base64.b64encode(token_json.encode("utf-8")).decode("utf-8")

        # Update the .env file dynamically
        with open(".env", "a") as env_file:
            env_file.write(f"\nGOOGLE_TOKEN_BASE64={token_base64}\n")
try:
    # Build the Classroom API service object
    service = build("classroom", "v1", credentials=creds)

    # Call the Classroom API to list courses
    results = service.courses().list(pageSize=10).execute()  # Get the first 10 courses
    courses = results.get("courses", [])  # Extract the list of courses

    if not courses:
        print("No courses found.")  # Print message if no courses are found
    else:
        # Prints the names of the first 10 courses.
        print("Courses:")
        for course in courses:
            print(course["name"], course["id"])  # Print each course's name and ID

except HttpError as error:
    print(f"An error occurred: {error}")  # Print error message if an HTTP error occurs
# %%
sys_mess = """You are an experienced academic grader responsible for evaluating student essays. Your task is to provide a fair, unbiased, and thorough evaluation. You will receive a rubric in JSON format.Follow the rubric provided in the prompt to assign scores and deliver detailed, constructive feedback. Ensure your response includes a breakdown of scores per rubric category and actionable suggestions for improvement. Total points possible is the aggregate sum of the max of each criterion. Total points received is the aggregate sum of the score the student received in each criterion """
# open ai is able to iterate and grade each written assignment
# I would like for the format of the results to be a specific structure
#points received
#points possible
#breakdown of rubric scores along with explanation of the scores
from pydantic import BaseModel
from openai import OpenAI
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)
class Grade(BaseModel):
    points_received: int
    points_possible: int
    rubric_breakdown: str
    explanation: str

def grade_submission_structured(essay_text, essay_rubric, sys_mess=""):
    
    # Create a prompt to grade the essay
    completion = client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": sys_mess},
            {"role": "user", "content": f"This is the essay prompt: {essay_rubric}"},
            {"role": "user", "content": f"This is the essay: {essay_text}"}
        ],
        response_format=Grade
    )
    return completion.choices[0].message.parsed
#%%
def get_user_name(service, user_id):
    """
    Retrieves the full name of a user given their user ID.

    Args:
        service: The Google Classroom API service instance.
        user_id: The ID of the user whose name is to be retrieved.

    Returns:
        The full name of the user, or 'Unknown Name' if an error occurs.
    """
    try:
        user_info = service.userProfiles().get(userId=user_id).execute()
        return user_info.get('name', {}).get('fullName', 'Unknown Name')
    except HttpError as error:
        print(f"An error occurred while retrieving user info: {error}")
        return 'Unknown Name'
#%% Function to download file content
def download_file(service, file_id):
    try:
        # Get file metadata to check the mimeType
        file_metadata = service.files().get(fileId=file_id, fields='mimeType, name').execute()
        mime_type = file_metadata.get('mimeType')  # Extract the mimeType of the file
        file_name = file_metadata.get('name')  # Extract the file name

        # Check if the file is a Google Docs Editors file
        if mime_type.startswith('application/vnd.google-apps.'):
            # Request to export Google Docs file as plain text
            request = service.files().export_media(fileId=file_id, mimeType='text/plain')
            fh = io.BytesIO()  # Create a byte stream to hold the file content
            downloader = MediaIoBaseDownload(fh, request)  # Initialize the downloader
            done = False
            while done is False:
                status, done = downloader.next_chunk()  # Download the file in chunks
            fh.seek(0)  # Reset the stream position to the beginning
            return mime_type,fh.read().decode('utf-8')  # Return the file content as a string
        else:
            # Direct download for non-Google Docs files into memory
            request = service.files().get_media(fileId=file_id)
            fh = io.BytesIO()  # Create a byte stream to hold the file content
            downloader = MediaIoBaseDownload(fh, request)  # Initialize the downloader
            done = False
            while done is False:
                status, done = downloader.next_chunk()  # Download the file in chunks
            fh.seek(0)  # Reset the stream position to the beginning
            # Process the file content in memory
            return mime_type,fh.getvalue()  # Return the file content as bytes
    except HttpError as error:
        print(f"An error occurred: {error}")  # Print error message if an HTTP error occurs
        return None  # Return None if an error occurs
# %%
# Helper function to reformat the name
def reformat_name(full_name):
    parts = full_name.rsplit(" ", 1)  # Split at the last space to separate the last name
    if len(parts) == 2:
        last_name, first_names = parts[1], parts[0]  # Last name is the last part
        return f"{last_name}, {first_names}"  # Format it as "Last Name, First Names"
    return full_name  # Return unchanged if format is unexpected

def print_assignment_contents(service, course_id, assignment_id):
    submissions = []  # Initialize an empty list to store submissions
    page_token = None  # Initialize page token for pagination
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
    assignment_name = service.courses().courseWork().get(courseId=course_id, id=assignment_id).execute().get('title', 'Unknown Assignment')
    graded_submissions = [{"assignment_name": assignment_name, "assignment_id": assignment_id}]  # Initialize a list to store graded submissions
    for submission in submissions:
        user_id = submission.get('userId')  # Get the user ID
        user_name = get_user_name(service, user_id)  # Get the user's name
        attachments = submission.get('assignmentSubmission', {}).get('attachments', [])
        for attachment in attachments:
            if 'driveFile' in attachment:
                drive_file = attachment['driveFile']  # Get the drive file details
                file_id = drive_file.get('id')  # Get the file ID
                drive_service = build('drive', 'v3', credentials=creds)  # Build the Drive API service
                mime_type, content = download_file(drive_service, file_id)  # Download the file content
                if content:
                    print("File Content:")
                    if mime_type == 'application/vnd.google-apps.document':
                        print(content)  # Print the plain text content
                        grade = grade_submission_structured(content, rubric)
                        print(f"{user_name}'s grade breakdown")
                        #print(grade, "\n\n")
                    else:
                        # Load the content into a Document object for .docx files
                        doc = Document(io.BytesIO(content))  # Create a Document from the content
                        submission_text = ""  # Initialize an empty string to store the submission text
                        for para in doc.paragraphs:
                            submission_text += para.text + "\n"  # Append each paragraph's text to submission_text
                        grade = grade_submission_structured(submission_text, rubric)
                    # Store the grade result, user name, assignment name, and ID in the list
                    graded_submissions.append({
                        "student": reformat_name(user_name),
                        "grade_result": grade.__dict__
                    })
    return graded_submissions



# %% using the rubric and calling the function
from rubric_extractor import parse_rubric
rubric = parse_rubric()
# Example usage
course_id = '755236001841'
assignment_id = '757850561158'

graded_submissions = print_assignment_contents(service, course_id, assignment_id)
#print(graded_submissions)

# %% Time to get the ai grader to authenticate into canvas
# Canvas API base URL
base_url = "https://canvas.instructure.com/api/v1/courses"
access_token = os.getenv("CANVAS_TOKEN")

# Set the headers for the request
headers = {
    "Authorization": f"Bearer {access_token}"
}

# Make the request to get the courses
response = requests.get(base_url, headers=headers)

# Check if the request was successful
if response.status_code == 200:
    # Parse the JSON response
    courses = response.json()
    print(courses)
# %% Create an assignment in canvas
def create_assignment(course_id, assignment_name, points_possible):
    """
    Creates a new assignment in the specified course.

    Args:
        course_id: The ID of the course.
        assignment_name: The name of the assignment.
        points_possible: The total points possible for the assignment.

    Returns:
        The response from the Canvas API.
    """
    url = f"{base_url}/{course_id}/assignments"
    payload = {
        "assignment": {
            "name": assignment_name,
            "points_possible": points_possible,
            "submission_types": ["online_upload"],
            "published": True
        }
    }
    response = requests.post(url, headers=headers, json=payload)
    return response.json()['id'],response.json()

def upload_grades(course_id, assignment_id, grades):
    """
    Uploads grades for a specific assignment.

    Args:
        course_id: The ID of the course.
        assignment_id: The ID of the assignment.
        grades: A dictionary of student IDs and their corresponding grades.

    Returns:
        The response from the Canvas API.
    """
    url = f"{base_url}/{course_id}/assignments/{assignment_id}/submissions/update_grades"
    payload = {
        "grade_data": grades
    }
    response = requests.post(url, headers=headers, json=payload)
    return response.json()

# Example usage
course_id = '11520136'
assignment_name = graded_submissions[0].get("assignment_name", "NewAssignment")
points_possible = graded_submissions[1].get("grade_result").get("points_possible")
section = "BUS340"

assignment_id,_= create_assignment(course_id, assignment_name, points_possible)

# Extract student names and points received

#%%
#before updating the grades, I need to rename the names to match the canvas names
# im only doing this as a test, but I won't have to do this in production
graded_submissions[1]['student'] = "Ogundipe, Toluandtunde"
graded_submissions[2]['student'] = "Ogundipe, Tolutunde"
#%%get id user ids by name
from get_user_id_script import get_user_id


def extract_grades_from_submissions(graded_submissions):
    """
    Extracts grades from the graded_submissions list and formats them for Canvas API.

    Args:
        graded_submissions: A list of dictionaries containing graded submissions.

    Returns:
        A dictionary of student names and their corresponding grades.
    """
    grades = {}
    for submission in graded_submissions[1:]:  # Skip the first entry as it contains assignment metadata
        student_name = submission['student']
        points_received = submission['grade_result']['points_received']
        grades[get_user_id(student_name)] = {"posted_grade": points_received}
    return grades



grades = extract_grades_from_submissions(graded_submissions)
print("Extracted Grades:", grades)


# %%
# Call the function to upload grades
response = upload_grades(course_id, assignment_id, grades)

# Check the response
if response.get('errors'):
    print("Failed to upload grades:", response['errors'])
else:
    print("Grades uploaded successfully:", response)

# %%

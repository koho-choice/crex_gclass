from rubric_extractor import parse_rubric
import io
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload
from docx import Document
import dotenv
import os
from googleapiclient.discovery import build
dotenv.load_dotenv()


def get_user_name_and_email(service, user_id):
    """
    Retrieves the full name and email of a user given their user ID.

    Args:
        service: The Google Classroom API service instance.
        user_id: The ID of the user whose name and email are to be retrieved.

    Returns:
        A tuple containing the full name and email of the user, or ('Unknown Name', 'Unknown Email') if an error occurs.
    """
    try:
        user_info = service.userProfiles().get(userId=user_id).execute()
        full_name = user_info.get('name', {}).get('fullName', 'Unknown Name')
        email = user_info.get('emailAddress', 'Unknown Email')
        return full_name, email
    except HttpError as error:
        print(f"An error occurred while retrieving user info: {error}")
        return 'Unknown Name', 'Unknown Email'
    
    # Helper function to reformat the Google Classroom name to match the Canvas name format
def reformat_name(full_name):
    parts = full_name.rsplit(" ", 1)  # Split at the last space to separate the last name
    if len(parts) == 2:
        last_name, first_names = parts[1], parts[0]  # Last name is the last part
        return f"{last_name}, {first_names}"  # Format it as "Last Name, First Names"
    return full_name  # Return unchanged if format is unexpected

# Function to grade the assignment contents
def grade_assignment_contents(service, course_id, assignment_id, rubric=None, creds=None, submission_ids=None):
    # Get the rubric
    if rubric is None:
        rubric = parse_rubric()
    submissions = []  # Initialize an empty list to store submissions
    page_token = None  # Initialize page token for pagination
    while True:
        # Call the Classroom API to list student submissions for the specified coursework
        submission_response = service.courses().courseWork().studentSubmissions().list(
            courseId=course_id,
            courseWorkId=assignment_id,
            pageToken=page_token
        ).execute()
        
        # Filter submissions if submission_ids is provided
        if submission_ids:
            submission_response['studentSubmissions'] = [sub for sub in submission_response['studentSubmissions'] if sub.get('id') in submission_ids]

        submissions.extend(submission_response.get('studentSubmissions', []))  # Add submissions to the list
        page_token = submission_response.get('nextPageToken')  # Get the next page token
        if not page_token:
            break  # Exit the loop if there are no more pages
    assignment_name = service.courses().courseWork().get(courseId=course_id, id=assignment_id).execute().get('title', 'Unknown Assignment')
    graded_submissions = [{"assignment_name": assignment_name, "assignment_id": assignment_id}]  # Initialize a list to store graded submissions
    for submission in submissions:
        submission_id = submission.get('id')  # Get the submission ID
        user_id = submission.get('userId')  # Get the user ID
        user_name, user_email = get_user_name_and_email(service, user_id)  # Get the user's name
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
                        "submission_id": submission_id,
                        "grade_result": grade.__dict__
                    })
    return graded_submissions

# Function to download the file content
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
sys_mess = """You are an experienced academic grader responsible for evaluating student essays. Your task is to provide a fair, unbiased, and thorough evaluation. You will receive a rubric in JSON format.Follow the rubric provided in the prompt to assign scores and deliver detailed, constructive feedback. Ensure your response includes a breakdown of scores per rubric category and actionable suggestions for improvement. Total points possible is the aggregate sum of the max of each criterion. Total points received is the aggregate sum of the score the student received in each criterion """
# open ai is able to iterate and grade each written assignment
# I would like for the format of the results to be a specific structure
#points received
#points possible
#breakdown of rubric scores along with explanation of the scores
from pydantic import BaseModel
from openai import OpenAI
api_key = os.getenv("OPENAI_KEY")
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
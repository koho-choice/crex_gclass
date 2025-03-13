#%%
# Import necessary modules and classes from FastAPI, Pydantic, Google OAuth2, and dotenv
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
from datetime import timedelta, datetime, timezone
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import jwt
from dotenv import load_dotenv
import os
import requests as req
import logging
logger = logging.getLogger("uvicorn.error")
#%%
security = HTTPBearer()
# Load environment variables from a .env file
load_dotenv()

# Initialize a FastAPI application
app = FastAPI()
# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173" ],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Retrieve the Google Client ID from environment variables
GOOGLE_CLIENT_ID = os.getenv("VITE_GOOGLE_CLIENT_ID")  # Replace with your actual client ID
SECRET_KEY = os.getenv("SECRET_KEY")  # Replace with your actual secret key
ALGORITHM = "HS256"
# Define a Pydantic model for the token data
class TokenData(BaseModel):
    token: str

user_tokens = {}
# Define a POST endpoint for Google authentication
@app.post("/auth/google")
async def google_auth(data: TokenData):
    try:
        print("Received Authorization Code (Backend):", data.token) #added line
        # Exchange the one-time Google credential for full OAuth tokens
        token_request_payload = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "code": data.token,
            "grant_type": "authorization_code",
            "redirect_uri": "http://127.0.0.1:5173",  # Must match frontend's Google OAuth setup
        }

        response = req.post("https://oauth2.googleapis.com/token", data=token_request_payload)
        token_data = response.json()
        logger.info("Token data received from Google: %s", token_data)
       # ✅ Check if `id_token` exists before verifying
        if "id_token" in token_data:
            user_info = id_token.verify_oauth2_token(token_data["id_token"], requests.Request(), GOOGLE_CLIENT_ID)
            email = user_info["email"]
        else:
                raise HTTPException(status_code=400, detail="No ID token received from Google")
        # Generate a JWT session token (valid for 1 hour)
        print("we got here1")
        expiration = datetime.now(timezone.utc) + timedelta(hours=1)
        session_token = jwt.encode({"sub": email, "exp": expiration}, SECRET_KEY, algorithm=ALGORITHM)
        #  If no refresh_token is provided, reuse the old one if available
        # Store the OAuth access token for the user
        print("we got here2")
        user_tokens[email] = {
            "access_token": token_data["access_token"],
            "refresh_token":  token_data["refresh_token"],  # This needs to be obtained separately
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "token_uri": "https://oauth2.googleapis.com/token"
        }   
        
        # Return a success message and user information if verification is successful
        return {"message": "User authenticated", "token": session_token, "user": user_info}
    except ValueError as e:
        # Raise an HTTP 401 error if the token is invalid
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        # Raise an HTTP 500 error for any other exceptions
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# %%
@app.get("/classroom/assignments")
def get_classroom_assignments(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials

    try:
        # Decode session token to get user email
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload["sub"]

        # Retrieve stored OAuth token
        if email not in user_tokens:
            raise HTTPException(status_code=401, detail="User not authenticated with Google Classroom")

        oauth_token = user_tokens[email]["access_token"]

        # Use stored OAuth token to fetch Google Classroom courses
        creds = Credentials(token=oauth_token)
        service = build("classroom", "v1", credentials=creds)

        courses = service.courses().list().execute()
        return {"assignments": courses.get("courses", [])}

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session token expired")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching assignments: {str(e)}")

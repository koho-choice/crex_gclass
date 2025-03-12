#%%
import requests
import os
from dotenv import load_dotenv
load_dotenv()
def get_user_id(user_name):
    user_name = user_name.split(", ")
    user_name = user_name[1] + " " + user_name[0]
    access_token = os.getenv("CANVAS_TOKEN")
    base_url = "https://canvas.instructure.com/api/v1"
    course_id = "11520136"
    url = f"{base_url}/courses/{course_id}/enrollments"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        for enrollment in data:
            if enrollment['role'] == 'StudentEnrollment' and enrollment['user']['name'] == user_name:
                return enrollment['user_id']
        return None  # Return None if user is not found
    else:
        print(f"Failed to retrieve users: {response.status_code} - {response.text}")
        return None
    

# %%

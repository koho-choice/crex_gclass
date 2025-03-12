#%%
# I'd like to authenticate into canvas

import requests
# Canvas API base URL
base_url = "https://canvas.instructure.com/api/v1/courses"
access_token = "7~7N9AtHfGRDYMYXn97uUyMt2eMyfK49BGLYX4BPJeazzPLRMTDAVV8xwDFzENAJn3"

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
else:
    print(f"Failed to retrieve courses: {response.status_code}")
#%%
# Function to get the list of courses the user teaches
def get_courses_taught():
    # Make the request to get the courses
    response = requests.get(base_url, headers=headers)

    # Check if the request was successful
    if response.status_code == 200:
        # Parse the JSON response
        courses = response.json()
        # Filter courses where the user is a teacher
        taught_courses = [course for course in courses if 'teacher' in course['enrollments'][0]['type']]
        return taught_courses
    else:
        print(f"Failed to retrieve courses: {response.status_code}")
        return []

# Get the list of courses taught by the user
courses_taught = get_courses_taught()
print("Courses taught by the user:")
for course in courses_taught:
    print(f"Course ID: {course['id']}, Course Name: {course['name']}")

#%%
# I'd like to get the assignments for a specific course

course_id = 11520136
assignments_url = f"{base_url}/{course_id}/assignments"

# Make the request to get the assignments
response = requests.get(assignments_url, headers=headers)

# Check if the request was successful
if response.status_code == 200:
    # Parse the JSON response
    assignments = response.json()
    
else:
    print(f"Failed to retrieve assignments: {response.status_code}")
#%%
#for each assignment, I'd like to get the name and id

for assignment in assignments:
    print(f"Assignment ID: {assignment['id']}, Assignment Name: {assignment['name']}")

#%%
# I'd like to get the submissions for an assignment

assignment_id = 53717593
submissions_url = f"{base_url}/{course_id}/assignments/{assignment_id}/submissions"

# Make the request to get the submissions
response = requests.get(submissions_url, headers=headers)

# Check if the request was successful
if response.status_code == 200:
    # Parse the JSON response
    submissions = response.json()
    #print(submissions)
else:
    print(f"Failed to retrieve submissions: {response.status_code}")    
#%%Get the user id for each submission

for submission in submissions:
    print(f"Submission ID: {submission['id']}, User ID: {submission['user_id']}")

#%%
# Update the submission grade for each student for this assignment (a given assignment id)
assignment_id = 53717593

# Define the URL for updating grades
update_grade_url = f"{base_url}/{course_id}/assignments/{assignment_id}/submissions/{{}}"

# Function to update grade for a submission
def update_grade(user_id, grade):
    url = update_grade_url.format(user_id)
    payload = {
        "submission": {
            "posted_grade": grade
        }
    }
    response = requests.put(url, headers=headers, json=payload)
    if response.status_code == 200:
        print(f"Successfully updated grade for user ID: {user_id}")
    else:
        print(f"Failed to update grade for user ID: {user_id}, Status Code: {response.status_code}")

# Example usage: Update grades for all submissions
for submission in submissions:
    user_id = submission['user_id']
    grade =55 # Example grade
    update_grade(user_id, grade)

# %%

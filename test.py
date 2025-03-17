#%%
import requests
import time

# Define the base URL of your FastAPI application
BASE_URL = "http://127.0.0.1:8000"

# Define the test inputs
email = "davidogundipe@gmail.com"
assignment_id = "757850561158"
course_id = "755236001841"
submission_ids = ["Cg4IiZf9vP0VEIa1p5uHFg"]
def test_grade_submission():
    # Make the POST request to the grade_submission endpoint
    response = requests.post(
        f"{BASE_URL}/classroom/grade_submission",
        params={
            "email": email,
            "assignment_id": assignment_id,
            "course_id": course_id
        },
        json={
            "submission_ids": submission_ids
        }
    )

    # Print the response status code and JSON data
    print("Status Code:", response.status_code)
    print("Response JSON:", response.json())

    # Check if the response is successful
    if response.status_code == 200:
        # Extract the task_id from the response
        task_id = response.json().get("task_id")

        # Periodically check the task status
        while True:
            status_response = requests.get(f"{BASE_URL}/classroom/task_status/{task_id}")
            status_data = status_response.json()

            # Print the status response
            print("Task Status Code:", status_response.status_code)
            print("Task Status JSON:", status_data)

            # Check if the task is completed or failed
            if "completed" in status_data.get("status") or "failed" in status_data.get("status"):
                break

            # Wait for a few seconds before checking again
            time.sleep(5)
    else:
        print("Failed to initiate grading.")

if __name__ == "__main__":
    test_grade_submission()
# %%

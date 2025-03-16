import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
interface SubmissionsProps {
  courseId: string;
  assignmentId: string;
}

const Submissions: React.FC<SubmissionsProps> = ({
  courseId,
  assignmentId,
}) => {
  const { user } = useAuth();
  const [submissionsData, setSubmissionsData] = useState<{
    assignment_name: string;
    submissions: any[];
  }>({ assignment_name: "", submissions: [] });

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/classroom/submissions?email=${user?.email}&course_id=${courseId}&assignment_id=${assignmentId}`
        );
        const data = await response.json();

        setSubmissionsData(data);
      } catch (error) {
        console.error("Error fetching submissions:", error);
      }
    };

    if (courseId && assignmentId) {
      fetchSubmissions();
    }
  }, [courseId, assignmentId]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        Submissions for {submissionsData.assignment_name}
      </h2>
      <div className="grid gap-4">
        {submissionsData.submissions.length === 0 ? (
          <div className="text-center text-gray-500">No submissions found.</div>
        ) : (
          submissionsData.submissions.map((submission, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 cursor-pointer transition-colors border-gray-200 hover:border-indigo-300"
            >
              <div className="flex justify-between items-center">
                <div>
                  <strong className="font-medium text-gray-900">
                    {submission.student_name || "Unknown Student"}
                  </strong>
                  <p className="text-sm text-gray-500">
                    {submission.student_email || "No email provided"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Submission ID: {submission.submission_id || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Title: {submission.submission_title || "No title"}
                  </p>
                  <p className="text-sm text-gray-500">
                    <a
                      href={submission.submission_link || "#"}
                      className="text-indigo-600 hover:text-indigo-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Submission
                    </a>
                  </p>
                  <p className="text-sm text-gray-500">
                    Date: {submission.submission_date || "No date"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Status: {submission.submission_status || "No status"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Score: {submission.submission_score || "No score"}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Submissions;

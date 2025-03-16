import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  max_points: number;
}

const Assignments = ({ courseId, onAssignmentSelect }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  useEffect(() => {
    if (courseId) {
      setLoading(true);
      fetch(
        `http://127.0.0.1:8000/classroom/assignments?email=${user?.email}&course_id=${courseId}`
      )
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Error: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          setAssignments(data.assignments);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [courseId]);

  if (loading) return <div>Loading assignments...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        Assignments for Course {courseId}
      </h2>
      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="border rounded-lg p-4 cursor-pointer transition-colors border-gray-200 hover:border-indigo-300"
            onClick={() => {
              console.log(assignment.id);
              onAssignmentSelect(assignment.id);
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <strong className="font-medium text-gray-900">
                  {assignment.title}
                </strong>
                <p className="text-sm text-gray-500">
                  Due Date: {assignment.due_date}
                </p>
                <p className="text-sm text-gray-500">
                  Max Points: {assignment.max_points}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Assignments;

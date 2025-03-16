import React, { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";

interface Course {
  id: number;
  name: string;
  section: string;
  room: string;
}

const Courses = ({ onCourseSelect }) => {
  const { isAuthenticated, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && user) {
      setLoading(true);
      fetch(`http://127.0.0.1:8000/classroom/courses?email=${user.email}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Error: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          setCourses(data.courses);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [isAuthenticated, user]);

  if (loading) return <div>Loading courses...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Courses</h2>
      <ul className="grid gap-4">
        {courses.map((course) => (
          <li
            key={course.id}
            className="border rounded-lg p-4 cursor-pointer transition-all hover:border-indigo-300 hover:shadow-md"
          >
            <button
              onClick={() => {
                onCourseSelect(course.id);
              }}
              className="w-full h-full text-left"
            >
              <strong className="text-gray-900">
                {course.name} {course.id}
              </strong>
              <p className="text-sm text-gray-500">
                Section: {course.section}, Room: {course.room}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Courses;

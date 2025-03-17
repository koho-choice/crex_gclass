import React, { useEffect, useState } from "react";
import { GraduationCap, Users, MapPin, ChevronRight } from "lucide-react";
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
          if (!res.ok) throw new Error(`Error: ${res.statusText}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-2">Error: {error}</div>
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Your Courses</h2>
        <div className="text-sm text-gray-500">{courses.length} courses</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => onCourseSelect(course.id)}
            className="card p-6 text-left hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary-600" />
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
            </div>

            <h3 className="mt-4 font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {course.name}
            </h3>

            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                <span>Section {course.section}</span>
              </div>
              {course.room && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>Room {course.room}</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Courses;

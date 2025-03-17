import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Calendar,
  Award,
  Loader2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3 text-primary-600">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="font-medium">Loading assignments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="flex items-center space-x-2 text-red-500 mb-4">
          <AlertCircle className="h-6 w-6" />
          <span className="font-medium">Error loading assignments</span>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Assignments</h2>
        <div className="text-sm text-gray-500">{assignments.length} total</div>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-gray-500">
            No assignments found for this course
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <button
              key={assignment.id}
              onClick={() => onAssignmentSelect(assignment.id)}
              className="w-full group bg-white rounded-xl p-6 shadow-sm border border-gray-100 
                         hover:border-primary-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-4 flex-1">
                  <div className="flex items-start justify-between">
                    <h3
                      className="font-medium text-gray-900 group-hover:text-primary-600 
                                 transition-colors line-clamp-2"
                    >
                      {assignment.title}
                    </h3>
                    <ChevronRight
                      className="h-5 w-5 text-gray-400 group-hover:text-primary-600 
                                          transition-colors flex-shrink-0 ml-4"
                    />
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Due {formatDate(assignment.due_date)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Award className="h-4 w-4 text-gray-400" />
                      <span>{assignment.max_points} points</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Assignments;

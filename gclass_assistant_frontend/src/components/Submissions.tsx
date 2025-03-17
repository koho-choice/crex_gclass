import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Mail,
  FileText,
  Calendar,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  Award,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface SubmissionsProps {
  courseId: string;
  assignmentId: string;
}

interface Submission {
  student_name: string;
  student_email: string;
  submission_id: string;
  submission_title: string;
  submission_link: string;
  submission_date: string;
  submission_status: string;
  submission_score: string | number;
}

const Submissions: React.FC<SubmissionsProps> = ({
  courseId,
  assignmentId,
}) => {
  const { user } = useAuth();
  const [submissionsData, setSubmissionsData] = useState<{
    assignment_name: string;
    submissions: Submission[];
  }>({ assignment_name: "", submissions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "submitted":
        return "bg-green-100 text-green-800";
      case "late":
        return "bg-yellow-100 text-yellow-800";
      case "missing":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "submitted":
        return <CheckCircle className="h-4 w-4" />;
      case "late":
        return <Clock className="h-4 w-4" />;
      case "missing":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://127.0.0.1:8000/classroom/submissions?email=${user?.email}&course_id=${courseId}&assignment_id=${assignmentId}`
        );
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        const data = await response.json();
        setSubmissionsData(data);
        setError("");
      } catch (error) {
        console.error("Error fetching submissions:", error);
        setError("Failed to load submissions. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (courseId && assignmentId) {
      fetchSubmissions();
    }
  }, [courseId, assignmentId, user?.email]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3 text-primary-600">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="font-medium">Loading submissions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="flex items-center space-x-2 text-red-500 mb-4">
          <AlertCircle className="h-6 w-6" />
          <span className="font-medium">Error loading submissions</span>
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
        <h2 className="text-2xl font-semibold text-gray-900">
          {submissionsData.assignment_name}
        </h2>
        <div className="text-sm text-gray-500">
          {submissionsData.submissions.length} submissions
        </div>
      </div>

      {submissionsData.submissions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500">
            No submissions found for this assignment
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {submissionsData.submissions.map((submission, index) => (
            <div
              key={submission.submission_id || index}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 
                       hover:border-primary-100 hover:shadow-md transition-all duration-200"
            >
              <div className="space-y-4">
                {/* Header with student info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <h3 className="font-medium text-gray-900">
                        {submission.student_name || "Unknown Student"}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>
                        {submission.student_email || "No email provided"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        submission.submission_status
                      )}`}
                    >
                      {getStatusIcon(submission.submission_status)}
                      <span className="ml-1">
                        {submission.submission_status || "Unknown"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Submission details */}
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-100">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span>{submission.submission_title || "No title"}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        {submission.submission_date
                          ? formatDate(submission.submission_date)
                          : "No date"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Award className="h-4 w-4 text-gray-400" />
                      <span>
                        Score: {submission.submission_score || "Not graded"}
                      </span>
                    </div>
                    {submission.submission_link && (
                      <a
                        href={submission.submission_link}
                        className="inline-flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>View Submission</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Submissions;

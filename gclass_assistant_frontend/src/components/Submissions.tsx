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
  Play,
  Sparkles,
  ChevronDown,
  ChevronUp,
  XCircle,
  Info,
} from "lucide-react";
import * as XLSX from "xlsx";
import GooglePicker from "./GooglePicker";

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
  grading_status?: "pending" | "in_progress" | "completed";
  task_id?: string;
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
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(
    new Set()
  );
  const [gradingInProgress, setGradingInProgress] = useState(false);
  const [gradingResults, setGradingResults] = useState<
    Map<
      string,
      {
        assignment_name: string;
        assignment_id: string;
        points_received: number;
        rubric_breakdown: string;
        graded_at: string;
        student_name: string;
        id: number;
        points_possible: number;
        explanation: string;
        submission_id: string;
      }
    >
  >(new Map());
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(
    new Set()
  );
  const [showPicker, setShowPicker] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [selectedRubricFileId, setSelectedRubricFileId] = useState<
    string | null
  >(null);

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
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "late":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "missing":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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

  const toggleSubmissionSelection = (submissionId: string) => {
    setSelectedSubmissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId);
        console.log(`Submission ${submissionId} untoggled for grading`);
      } else {
        newSet.add(submissionId);
        console.log(`Submission ${submissionId} toggled for grading`);
      }
      return newSet;
    });
  };

  const toggleExpandedSubmission = (submissionId: string) => {
    setExpandedSubmissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId);
      } else {
        newSet.add(submissionId);
      }
      return newSet;
    });
  };

  const handleFileSelect = (fileId: string) => {
    console.log("Selected rubric file ID:", fileId);
    setSelectedRubricFileId(fileId);
  };

  const initiateGrading = async () => {
    if (selectedSubmissions.size === 0 || !selectedRubricFileId) return;

    setGradingInProgress(true);
    const submissionsToGrade = Array.from(selectedSubmissions);

    try {
      for (const submissionId of submissionsToGrade) {
        const response = await fetch(
          `http://127.0.0.1:8000/classroom/grade_submission?email=${user?.email}&assignment_id=${assignmentId}&course_id=${courseId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              submission_ids: [submissionId],
              rubric: selectedRubricFileId,
            }),
          }
        );

        if (!response.ok) throw new Error("Failed to initiate grading");

        const { task_id } = await response.json();

        setSubmissionsData((prev) => ({
          ...prev,
          submissions: prev.submissions.map((sub) =>
            sub.submission_id === submissionId
              ? { ...sub, task_id, grading_status: "in_progress" }
              : sub
          ),
        }));

        pollGradingStatus(submissionId, task_id);
      }
    } catch (error) {
      console.error("Error initiating grading:", error);
      setError("Failed to start grading process");
    }
  };

  const pollGradingStatus = async (submissionId: string, taskId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/classroom/task_status/${taskId}`
        );
        if (!response.ok) throw new Error("Failed to check grading status");

        const { status } = await response.json();

        if (status.includes("completed")) {
          clearInterval(pollInterval);

          setSubmissionsData((prev) => {
            const updatedData = {
              ...prev,
              submissions: prev.submissions.map((sub) =>
                sub.submission_id === submissionId
                  ? {
                      ...sub,
                      grading_status: "completed",
                      submission_score: `${
                        gradingResults.get(submissionId)?.points_received || 0
                      }/${
                        gradingResults.get(submissionId)?.points_possible || 0
                      }`,
                    }
                  : sub
              ),
            };

            const allCompleted = updatedData.submissions.every(
              (sub) =>
                !selectedSubmissions.has(sub.submission_id) ||
                sub.grading_status === "completed"
            );

            if (allCompleted) {
              setGradingInProgress(false);
              setSelectedSubmissions(new Set());
            }

            return updatedData;
          });

          fetchGradingResults(submissionId);
        } else if (status.includes("failed")) {
          clearInterval(pollInterval);
          console.error(`Grading failed for submission ${submissionId}`);
          setError(`Grading failed for submission ${submissionId}`);
          setGradingInProgress(false);
        }
      } catch (error) {
        console.error("Error checking grading status:", error);
        clearInterval(pollInterval);
      }
    }, 2000);
  };

  const fetchGradingResults = async (submissionId: string) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/classroom/graded_submissions?submission_id=${submissionId}`
      );
      if (!response.ok) throw new Error("Failed to fetch grading results");

      const data = await response.json();
      setGradingResults((prev) =>
        new Map(prev).set(submissionId, data.latest_graded_submission)
      );

      setSubmissionsData((prev) => ({
        ...prev,
        submissions: prev.submissions.map((sub) =>
          sub.submission_id === submissionId
            ? {
                ...sub,
                submission_score: `${
                  data.latest_graded_submission.points_received || 0
                }/${data.latest_graded_submission.points_possible || 0}`,
              }
            : sub
        ),
      }));
    } catch (error) {
      console.error("Error fetching grading results:", error);
    }
  };

  const exportToExcel = () => {
    const data = submissionsData.submissions.map((submission) => ({
      Student: submission.student_name,
      Score: submission.submission_score,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");

    XLSX.writeFile(workbook, "Submissions.xlsx");
  };

  const handleSubmissionClick = (submissionId: string) => {
    console.log("Submission clicked:", submissionId);
    setSelectedSubmissionId(submissionId);
    setShowPicker(true);
    console.log("showPicker set to true");
  };
  // Assume fileId is the selected file ID from the Picker

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://127.0.0.1:8000/classroom/submissions?email=${user?.email}&course_id=${courseId}&assignment_id=${assignmentId}`
        );
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);
        const data = await response.json();
        setSubmissionsData(data);
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
        <div className="flex items-center space-x-3 text-indigo-600">
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
          <XCircle className="h-6 w-6" />
          <span className="font-medium">Error loading submissions</span>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            {submissionsData.assignment_name}
            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
              {submissionsData.submissions.length} submissions
            </span>
          </h2>
        </div>

        {selectedSubmissions.size > 0 && (
          <button
            onClick={initiateGrading}
            disabled={gradingInProgress || !selectedRubricFileId}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors
              ${
                gradingInProgress || !selectedRubricFileId
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            aria-label={
              gradingInProgress
                ? "Grading in progress"
                : !selectedRubricFileId
                ? "Select a rubric file to enable grading"
                : `Grade ${selectedSubmissions.size} selected submissions`
            }
          >
            {gradingInProgress ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Grading in Progress...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Grade Selected ({selectedSubmissions.size})
              </>
            )}
          </button>
        )}

        {!gradingInProgress &&
          submissionsData.submissions.every(
            (sub) => sub.grading_status === "completed"
          ) && (
            <div className="flex flex-col items-center">
              <button
                onClick={exportToExcel}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition-colors"
              >
                Export to Excel
              </button>
              <p className="mt-2 text-sm text-gray-600">
                Specially prepared file for your LMS (Schoology or Canvas).
              </p>
            </div>
          )}
      </div>

      {submissionsData.submissions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
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
              className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200
                ${
                  selectedSubmissions.has(submission.submission_id)
                    ? "border-indigo-500 ring-1 ring-indigo-500"
                    : "border-gray-100 hover:border-indigo-100"
                }`}
              onClick={() => handleSubmissionClick(submission.submission_id)}
            >
              <div className="p-6">
                <div className="space-y-4">
                  {/* Header with student info and selection */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <User className="h-5 w-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900">
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

                    <div className="flex items-center space-x-3">
                      {submission.grading_status === "in_progress" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Grading...
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                            submission.submission_status
                          )}`}
                        >
                          {getStatusIcon(submission.submission_status)}
                          <span className="ml-2">
                            {submission.submission_status || "Unknown"}
                          </span>
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSubmissionSelection(submission.submission_id);

                          setShowPicker(true);
                        }}
                        disabled={submission.grading_status === "in_progress"}
                        className={`p-2 rounded-md transition-colors
                          ${
                            selectedSubmissions.has(submission.submission_id)
                              ? "bg-indigo-100 text-indigo-600"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        aria-label={
                          selectedSubmissions.has(submission.submission_id)
                            ? "Deselect submission"
                            : "Select submission for grading"
                        }
                      >
                        {selectedSubmissions.has(submission.submission_id) ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submission details */}
                  <div className="grid md:grid-cols-2 gap-4 py-4 border-y border-gray-100">
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
                      <div className="flex items-center space-x-2 text-sm">
                        <Award className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          Score:
                          {submission.grading_status === "in_progress" ? (
                            <span className="text-gray-500">
                              Grading in progress...
                            </span>
                          ) : (
                            submission.submission_score || "Not graded.."
                          )}
                        </span>
                      </div>
                      {submission.submission_link && (
                        <a
                          href={submission.submission_link}
                          className="inline-flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>View Submission</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Grading Results */}
                  {gradingResults.has(submission.submission_id) && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandedSubmission(submission.submission_id);
                        }}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <Info className="h-5 w-5 text-indigo-500" />
                          <span className="font-medium text-gray-900">
                            Grading Results
                          </span>
                        </div>
                        {expandedSubmissions.has(submission.submission_id) ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      {expandedSubmissions.has(submission.submission_id) && (
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="font-medium text-gray-700">
                                Points
                              </p>
                              <p className="text-gray-600">
                                {
                                  gradingResults.get(submission.submission_id)
                                    ?.points_received
                                }{" "}
                                /{" "}
                                {
                                  gradingResults.get(submission.submission_id)
                                    ?.points_possible
                                }
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">
                                Graded At
                              </p>
                              <p className="text-gray-600">
                                {new Date(
                                  gradingResults.get(
                                    submission.submission_id
                                  )?.graded_at
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">
                              Rubric Breakdown
                            </p>
                            <p className="text-gray-600 whitespace-pre-line">
                              {
                                gradingResults.get(submission.submission_id)
                                  ?.rubric_breakdown
                              }
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">
                              Explanation
                            </p>
                            <p className="text-gray-600">
                              {
                                gradingResults.get(submission.submission_id)
                                  ?.explanation
                              }
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showPicker && (
        <div className="mt-4">
          <GooglePicker onFileSelect={handleFileSelect} />
        </div>
      )}
    </div>
  );
};

export default Submissions;

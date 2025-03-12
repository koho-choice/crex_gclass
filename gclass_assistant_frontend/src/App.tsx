import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle,
  FileCheck,
  RefreshCw,
  Upload,
  AlertCircle,
  ChevronDown,
  LogIn,
  User,
  LogOut,
  Loader2,
  Check,
  X,
  EyeOff,
  MessageSquare,
  ChevronRight,
} from "lucide-react";

type RubricCriterion = {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
};

type RubricFeedback = {
  criterionId: string;
  points: number;
  feedback: string;
  suggestions: string[];
};

type Assignment = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  rubric: RubricCriterion[];
  submissions: Submission[];
};

type Submission = {
  id: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  attachments: string[];
  grade?: number;
  selected?: boolean;
  grading?: boolean;
  regrading?: boolean;
  feedback?: RubricFeedback[];
};

type GradingStatus = "pending" | "inProgress" | "completed";

type RegradeRequest = {
  submissionId: string;
  reason: string;
  context: string;
};

type CanvasStudent = {
  id: string;
  name: string;
  email: string;
  studentId: string;
  section: string;
  course: string;
  matched?: boolean;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [gradingStatus, setGradingStatus] = useState<GradingStatus>("pending");
  const [showRegradeModal, setShowRegradeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [regradeHovered, setRegradeHovered] = useState<string | null>(null);
  const [currentRegradeSubmission, setCurrentRegradeSubmission] = useState<
    string | null
  >(null);
  const [regradeReason, setRegradeReason] = useState("");
  const [regradeContext, setRegradeContext] = useState("");
  const [showCanvasModal, setShowCanvasModal] = useState(false);
  const [uploadingToCanvas, setUploadingToCanvas] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [hideUnmatched, setHideUnmatched] = useState(false);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);

  const mockRubric: RubricCriterion[] = [
    {
      id: "thesis",
      name: "Thesis Statement",
      description: "Clear and well-developed thesis that addresses the prompt",
      maxPoints: 20,
    },
    {
      id: "evidence",
      name: "Evidence & Analysis",
      description:
        "Relevant evidence and thorough analysis supporting the thesis",
      maxPoints: 30,
    },
    {
      id: "organization",
      name: "Organization & Structure",
      description: "Logical organization with clear transitions between ideas",
      maxPoints: 25,
    },
    {
      id: "writing",
      name: "Writing Mechanics",
      description: "Grammar, spelling, punctuation, and academic writing style",
      maxPoints: 25,
    },
  ];

  const mockAssignments: Assignment[] = [
    {
      id: "1",
      title: "Essay: Impact of Climate Change",
      subject: "Environmental Science",
      dueDate: "2024-03-20",
      rubric: mockRubric,
      submissions: [
        {
          id: "sub1",
          studentName: "Emma Thompson",
          studentEmail: "emma.t@school.edu",
          submittedAt: "2024-03-19T14:30:00Z",
          attachments: ["Climate_Change_Essay.pdf"],
          grade: 85,
          feedback: [
            {
              criterionId: "thesis",
              points: 18,
              feedback:
                "Strong thesis that clearly outlines the main arguments about climate change impacts.",
              suggestions: [
                "Consider addressing potential counterarguments in the thesis",
                "Add more specificity about which impacts will be discussed",
              ],
            },
            {
              criterionId: "evidence",
              points: 25,
              feedback:
                "Well-researched with relevant scientific data and case studies.",
              suggestions: [
                "Include more recent studies from the past 2-3 years",
                "Strengthen the connection between evidence and main arguments",
              ],
            },
            {
              criterionId: "organization",
              points: 22,
              feedback:
                "Clear structure with effective transitions between major points.",
              suggestions: [
                "Consider reorganizing the section on economic impacts",
                "Add a stronger conclusion that ties back to the thesis",
              ],
            },
            {
              criterionId: "writing",
              points: 20,
              feedback: "Generally well-written with few mechanical errors.",
              suggestions: [
                "Review comma usage in complex sentences",
                "Maintain consistent academic tone throughout",
              ],
            },
          ],
        },
        {
          id: "sub2",
          studentName: "Michael Chen",
          studentEmail: "michael.c@school.edu",
          submittedAt: "2024-03-19T16:45:00Z",
          attachments: ["Environmental_Impact_Analysis.docx"],
          grade: 92,
          feedback: [
            {
              criterionId: "thesis",
              points: 19,
              feedback:
                "Excellent thesis that presents a nuanced argument about climate change.",
              suggestions: [
                "Consider narrowing the scope slightly for even more depth",
              ],
            },
            {
              criterionId: "evidence",
              points: 28,
              feedback:
                "Exceptional use of current research and data analysis.",
              suggestions: ["Include more international case studies"],
            },
            {
              criterionId: "organization",
              points: 23,
              feedback: "Very well-organized with clear progression of ideas.",
              suggestions: [
                "Consider adding subheadings for better navigation",
              ],
            },
            {
              criterionId: "writing",
              points: 22,
              feedback: "Strong academic writing style with minimal errors.",
              suggestions: ["Review APA citation format for consistency"],
            },
          ],
        },
        {
          id: "sub3",
          studentName: "Sarah Johnson",
          studentEmail: "sarah.j@school.edu",
          submittedAt: "2024-03-20T09:15:00Z",
          attachments: ["Climate_Essay_Final.pdf", "References.pdf"],
          grade: 78,
          feedback: [
            {
              criterionId: "thesis",
              points: 15,
              feedback:
                "Thesis present but could be more specific and focused.",
              suggestions: [
                "Clarify the main argument",
                "Be more specific about the aspects of climate change being discussed",
                "Add a clear roadmap for the essay",
              ],
            },
            {
              criterionId: "evidence",
              points: 22,
              feedback: "Good evidence but some claims need stronger support.",
              suggestions: [
                "Add more peer-reviewed sources",
                "Include more specific data points",
                "Strengthen the analysis of existing evidence",
              ],
            },
            {
              criterionId: "organization",
              points: 20,
              feedback: "Generally organized but some transitions need work.",
              suggestions: [
                "Improve transitions between paragraphs",
                "Restructure the middle section for better flow",
                "Add a stronger conclusion",
              ],
            },
            {
              criterionId: "writing",
              points: 21,
              feedback: "Some mechanical errors but generally clear writing.",
              suggestions: [
                "Review for grammar consistency",
                "Check punctuation in complex sentences",
              ],
            },
          ],
        },
      ],
    },
    {
      id: "2",
      title: "Research Paper: Modern Literature",
      subject: "English",
      dueDate: "2024-03-22",
      rubric: mockRubric,
      submissions: [
        {
          id: "sub4",
          studentName: "David Wilson",
          studentEmail: "david.w@school.edu",
          submittedAt: "2024-03-21T11:20:00Z",
          attachments: ["Modern_Lit_Research.pdf"],
          grade: 88,
          feedback: [
            {
              criterionId: "thesis",
              points: 17,
              feedback:
                "Clear thesis with good focus on modern literary trends.",
              suggestions: [
                "Consider addressing broader implications",
                "Add more context about the time period",
              ],
            },
            {
              criterionId: "evidence",
              points: 26,
              feedback: "Strong textual evidence and literary analysis.",
              suggestions: [
                "Include more contemporary critical perspectives",
                "Add more comparative analysis between texts",
              ],
            },
            {
              criterionId: "organization",
              points: 23,
              feedback: "Well-structured with clear thematic organization.",
              suggestions: [
                "Consider a more dynamic opening paragraph",
                "Strengthen transitions between major sections",
              ],
            },
            {
              criterionId: "writing",
              points: 22,
              feedback: "Strong academic writing with appropriate style.",
              suggestions: [
                "Review MLA format consistency",
                "Check quotation integration",
              ],
            },
          ],
        },
        {
          id: "sub5",
          studentName: "Lisa Garcia",
          studentEmail: "lisa.g@school.edu",
          submittedAt: "2024-03-21T13:50:00Z",
          attachments: ["Literature_Analysis.docx"],
          grade: 95,
          feedback: [
            {
              criterionId: "thesis",
              points: 19,
              feedback:
                "Exceptional thesis that presents an original argument.",
              suggestions: [
                "Consider broader implications for literary studies",
              ],
            },
            {
              criterionId: "evidence",
              points: 29,
              feedback: "Outstanding use of primary and secondary sources.",
              suggestions: ["Add more contemporary critical perspectives"],
            },
            {
              criterionId: "organization",
              points: 24,
              feedback: "Excellent organization with clear progression.",
              suggestions: ["Consider adding a brief roadmap in introduction"],
            },
            {
              criterionId: "writing",
              points: 23,
              feedback: "Nearly flawless writing mechanics and style.",
              suggestions: ["Review consistency in citation format"],
            },
          ],
        },
      ],
    },
  ];

  const mockCanvasStudents: CanvasStudent[] = [
    {
      id: "canvas1",
      name: "Emma Thompson",
      email: "emma.t@school.edu",
      studentId: "2024001",
      section: "Section A",
      course: "ENV101",
      matched: true,
    },
    {
      id: "canvas2",
      name: "Michael Chen",
      email: "michael.c@school.edu",
      studentId: "2024002",
      section: "Section A",
      course: "ENV101",
      matched: true,
    },
    {
      id: "canvas3",
      name: "Sarah Johnson",
      email: "sarah.j@school.edu",
      studentId: "2024003",
      section: "Section B",
      course: "ENV101",
      matched: true,
    },
    {
      id: "canvas4",
      name: "John Smith",
      email: "john.s@school.edu",
      studentId: "2024004",
      section: "Section B",
      course: "ENV101",
      matched: false,
    },
  ];

  const filteredCanvasStudents = hideUnmatched
    ? mockCanvasStudents.filter((student) => student.matched)
    : mockCanvasStudents;

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedAssignment(null);
    setGradingStatus("pending");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleSubmissionSelection = (submissionId: string) => {
    if (selectedAssignment) {
      const updatedSubmissions = selectedAssignment.submissions.map(
        (submission) => ({
          ...submission,
          selected:
            submission.id === submissionId
              ? !submission.selected
              : submission.selected,
        })
      );
      setSelectedAssignment({
        ...selectedAssignment,
        submissions: updatedSubmissions,
      });
    }
  };

  const selectAllSubmissions = () => {
    if (selectedAssignment) {
      const updatedSubmissions = selectedAssignment.submissions.map(
        (submission) => ({
          ...submission,
          selected: true,
        })
      );
      setSelectedAssignment({
        ...selectedAssignment,
        submissions: updatedSubmissions,
      });
    }
  };

  const simulateAIGrading = async (submission: Submission): Promise<number> => {
    const processingTime = Math.random() * 2000 + 1000;
    await new Promise((resolve) => setTimeout(resolve, processingTime));
    return Math.floor(Math.random() * 31) + 70;
  };

  const handleGradeSubmissions = async () => {
    if (!selectedAssignment) return;

    const selectedSubmissions = selectedAssignment.submissions.filter(
      (sub) => sub.selected
    );
    if (selectedSubmissions.length === 0) return;

    setGradingStatus("inProgress");

    const updatedSubmissions = [...selectedAssignment.submissions];
    for (const submission of updatedSubmissions) {
      if (submission.selected) {
        submission.grading = true;
        setSelectedAssignment({
          ...selectedAssignment,
          submissions: updatedSubmissions,
        });

        const grade = await simulateAIGrading(submission);

        submission.grade = grade;
        submission.grading = false;
        setSelectedAssignment({
          ...selectedAssignment,
          submissions: updatedSubmissions,
        });
      }
    }

    setGradingStatus("completed");
  };

  const getSelectedCount = () => {
    return (
      selectedAssignment?.submissions.filter((sub) => sub.selected).length || 0
    );
  };

  const handleRegradeRequest = async () => {
    if (!selectedAssignment || !currentRegradeSubmission) return;

    const updatedSubmissions = selectedAssignment.submissions.map(
      (submission) => {
        if (submission.id === currentRegradeSubmission) {
          return { ...submission, regrading: true };
        }
        return submission;
      }
    );

    setSelectedAssignment({
      ...selectedAssignment,
      submissions: updatedSubmissions,
    });

    setShowRegradeModal(false);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const submission = selectedAssignment.submissions.find(
      (s) => s.id === currentRegradeSubmission
    );
    const oldGrade = submission?.grade || 0;
    const gradeChange = Math.floor(Math.random() * 7) - 3;
    const newGrade = Math.max(0, Math.min(100, oldGrade + gradeChange));

    const finalSubmissions = selectedAssignment.submissions.map(
      (submission) => {
        if (submission.id === currentRegradeSubmission) {
          return {
            ...submission,
            grade: newGrade,
            regrading: false,
          };
        }
        return submission;
      }
    );

    setSelectedAssignment({
      ...selectedAssignment,
      submissions: finalSubmissions,
    });

    setRegradeReason("");
    setRegradeContext("");
    setCurrentRegradeSubmission(null);
  };

  const handleUploadToCanvas = async () => {
    setUploadingToCanvas(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setUploadComplete(true);
    setUploadingToCanvas(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">
                AI Grading Assistant
              </h1>
            </div>
            {!isAuthenticated ? (
              <button
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 ${
                  isLoading ? "opacity-75 cursor-not-allowed" : ""
                }`}
                onClick={handleGoogleAuth}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="animate-spin h-5 w-5 mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5 mr-2" />
                    Connect to Google Classroom
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm">
                  <User className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-gray-700">Ms. Anderson</span>
                </div>
                <button
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAuthenticated ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-2 text-lg font-medium text-gray-900">
              Welcome to AI Grading Assistant
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Connect with Google Classroom to get started
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">Select Assignment</h2>
              <div className="grid gap-4">
                {mockAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedAssignment?.id === assignment.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-indigo-300"
                    }`}
                    onClick={() => setSelectedAssignment(assignment)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {assignment.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {assignment.subject} • Due: {assignment.dueDate}
                        </p>
                      </div>
                      <div className="text-sm text-gray-600">
                        {assignment.submissions.length} submissions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedAssignment && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedAssignment.title}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedAssignment.subject} • Due:{" "}
                      {selectedAssignment.dueDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                      onClick={selectAllSubmissions}
                    >
                      Select All
                    </button>
                    <button
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                        getSelectedCount() > 0
                          ? "text-white bg-indigo-600 hover:bg-indigo-700"
                          : "text-gray-400 bg-gray-100 cursor-not-allowed"
                      }`}
                      onClick={handleGradeSubmissions}
                      disabled={getSelectedCount() === 0}
                    >
                      <FileCheck className="mr-2 h-5 w-5" />
                      Grade Selected ({getSelectedCount()})
                    </button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Submissions</h3>
                  <div className="space-y-4">
                    {selectedAssignment.submissions.map((submission) => (
                      <div
                        key={submission.id}
                        className={`border rounded-lg p-4 transition-colors ${
                          submission.selected
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              checked={submission.selected || false}
                              onChange={() =>
                                toggleSubmissionSelection(submission.id)
                              }
                              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {submission.studentName}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {submission.studentEmail}
                              </p>
                              <p className="text-sm text-gray-500">
                                Submitted: {formatDate(submission.submittedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            {submission.grading || submission.regrading ? (
                              <div className="flex items-center space-x-2 text-indigo-600">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span className="text-sm">
                                  {submission.regrading
                                    ? "Regrading..."
                                    : "Grading..."}
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    className="w-20 px-3 py-1 border rounded-md"
                                    value={submission.grade || ""}
                                    placeholder="Grade"
                                    readOnly
                                  />
                                  {submission.feedback && (
                                    <button
                                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
                                      onClick={() =>
                                        setShowFeedback(
                                          showFeedback === submission.id
                                            ? null
                                            : submission.id
                                        )
                                      }
                                    >
                                      <MessageSquare className="h-4 w-4 mr-1" />
                                      Feedback
                                      <ChevronRight
                                        className={`h-4 w-4 ml-1 transform transition-transform ${
                                          showFeedback === submission.id
                                            ? "rotate-90"
                                            : ""
                                        }`}
                                      />
                                    </button>
                                  )}
                                </div>
                                <div className="relative">
                                  <button
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
                                    onClick={() => {
                                      setCurrentRegradeSubmission(
                                        submission.id
                                      );
                                      setShowRegradeModal(true);
                                    }}
                                    onMouseEnter={() =>
                                      setRegradeHovered(submission.id)
                                    }
                                    onMouseLeave={() => setRegradeHovered(null)}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-1" />
                                    Request Regrade
                                  </button>
                                  {regradeHovered === submission.id && (
                                    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap">
                                      Request AI to regrade this submission
                                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-7">
                          {submission.attachments.map((attachment, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {attachment}
                            </span>
                          ))}
                        </div>

                        {showFeedback === submission.id &&
                          submission.feedback && (
                            <div className="mt-4 ml-7 bg-gray-50 rounded-lg p-4">
                              <h5 className="font-medium text-gray-900 mb-4">
                                AI Feedback
                              </h5>
                              <div className="space-y-6">
                                {submission.feedback.map((feedback) => {
                                  const criterion =
                                    selectedAssignment.rubric.find(
                                      (c) => c.id === feedback.criterionId
                                    );
                                  return (
                                    <div
                                      key={feedback.criterionId}
                                      className="space-y-2"
                                    >
                                      <div className="flex justify-between items-baseline">
                                        <h6 className="font-medium text-gray-800">
                                          {criterion?.name}
                                        </h6>
                                        <span className="text-sm text-gray-600">
                                          {feedback.points}/
                                          {criterion?.maxPoints} points
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600">
                                        {criterion?.description}
                                      </p>
                                      <p className="text-sm text-gray-800">
                                        {feedback.feedback}
                                      </p>
                                      {feedback.suggestions.length > 0 && (
                                        <div className="mt-2">
                                          <h6 className="text-sm font-medium text-gray-700 mb-1">
                                            Suggestions for Improvement:
                                          </h6>
                                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                            {feedback.suggestions.map(
                                              (suggestion, index) => (
                                                <li key={index}>
                                                  {suggestion}
                                                </li>
                                              )
                                            )}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {gradingStatus === "completed" && (
              <div className="flex justify-end">
                <button
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  onClick={() => setShowCanvasModal(true)}
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload to Canvas
                </button>
              </div>
            )}

            {showCanvasModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">
                      Validate Canvas Class Information
                    </h3>
                    <button
                      className="text-gray-400 hover:text-gray-500"
                      onClick={() => {
                        setShowCanvasModal(false);
                        setUploadComplete(false);
                      }}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {!uploadComplete ? (
                    <>
                      <div className="mb-4 flex justify-between items-center">
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            Please verify that the student information matches
                            before uploading grades.
                          </span>
                        </div>
                        <button
                          className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            hideUnmatched
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                          onClick={() => setHideUnmatched(!hideUnmatched)}
                        >
                          <EyeOff className="h-4 w-4 mr-2" />
                          {hideUnmatched ? "Show Unmatched" : "Hide Unmatched"}
                        </button>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Student
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Student ID
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Section
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredCanvasStudents.map((student) => (
                              <tr key={student.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {student.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {student.email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {student.studentId}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {student.section}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {student.matched ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <Check className="h-4 w-4 mr-1" />
                                      Matched
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      <AlertCircle className="h-4 w-4 mr-1" />
                                      Not Found
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 flex justify-end">
                        <button
                          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 ${
                            uploadingToCanvas
                              ? "opacity-75 cursor-not-allowed"
                              : ""
                          }`}
                          onClick={handleUploadToCanvas}
                          disabled={uploadingToCanvas}
                        >
                          {uploadingToCanvas ? (
                            <>
                              <Loader2 className="animate-spin h-5 w-5 mr-2" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-5 w-5 mr-2" />
                              Upload Grades
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        Upload Complete
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        All grades have been successfully uploaded to Canvas
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showRegradeModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Request Regrade</h3>
                    <button
                      className="text-gray-400 hover:text-gray-500"
                      onClick={() => setShowRegradeModal(false)}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Reason for Regrade
                      </label>
                      <textarea
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        rows={3}
                        value={regradeReason}
                        onChange={(e) => setRegradeReason(e.target.value)}
                        placeholder="Explain why you're requesting a regrade..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Additional Context
                      </label>
                      <textarea
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        rows={3}
                        value={regradeContext}
                        onChange={(e) => setRegradeContext(e.target.value)}
                        placeholder="Provide any additional context..."
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      onClick={() => setShowRegradeModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                      onClick={handleRegradeRequest}
                    >
                      Submit Request
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;

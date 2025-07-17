import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChevronDown, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const AssignmentPerformance = ({ assignments, selectedAssignment, onAssignmentSelect }) => {
  // Transform grade distribution data for the chart
  const gradeData = Object.entries(selectedAssignment.gradeDistribution).map(([grade, count]) => ({
    grade,
    count,
    percentage: Math.round((count / selectedAssignment.totalStudents) * 100)
  }));

  // Color mapping for grades
  const gradeColors = {
    'A': '#22c55e', // green
    'B': '#3b82f6', // blue
    'C': '#f59e0b', // yellow
    'D': '#f97316', // orange
    'F': '#ef4444'  // red
  };

  // Calculate areas that need attention (rubric scores below 50%)
  const areasToReteach = selectedAssignment.rubric.filter(
    criterion => (criterion.avgScore / criterion.maxScore) < 0.5
  );

  const getScoreColor = (avgScore, maxScore) => {
    const percentage = (avgScore / maxScore) * 100;
    if (percentage >= 80) return 'text-success-600 bg-success-50';
    if (percentage >= 60) return 'text-warning-600 bg-warning-50';
    return 'text-danger-600 bg-danger-50';
  };

  const getScoreIcon = (avgScore, maxScore) => {
    const percentage = (avgScore / maxScore) * 100;
    if (percentage >= 80) return <CheckCircle className="h-4 w-4" />;
    if (percentage >= 60) return <Clock className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Assignment Selector */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Assignment Performance</h2>
          <div className="relative">
            <select
              value={selectedAssignment.id}
              onChange={(e) => {
                const assignment = assignments.find(a => a.id === e.target.value);
                onAssignmentSelect(assignment);
              }}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {assignments.map(assignment => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.assignmentName}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Assignment Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Average Score</p>
            <p className="text-2xl font-bold text-gray-900">{selectedAssignment.averageScore}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Submissions</p>
            <p className="text-2xl font-bold text-gray-900">
              {selectedAssignment.submitted}/{selectedAssignment.totalStudents}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Due Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(selectedAssignment.dueDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Grade Distribution Chart */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Grade Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value} students (${gradeData.find(d => d.count === value)?.percentage}%)`,
                    'Count'
                  ]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {gradeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={gradeColors[entry.grade]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rubric Performance */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Rubric Criteria Performance</h3>
          <div className="space-y-3">
            {selectedAssignment.rubric.map((criterion, index) => {
              const percentage = Math.round((criterion.avgScore / criterion.maxScore) * 100);
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-1 rounded ${getScoreColor(criterion.avgScore, criterion.maxScore)}`}>
                      {getScoreIcon(criterion.avgScore, criterion.maxScore)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{criterion.criterion}</p>
                      <p className="text-sm text-gray-600">
                        {criterion.avgScore.toFixed(1)}/{criterion.maxScore} ({percentage}%)
                      </p>
                    </div>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        percentage >= 80 ? 'bg-success-500' :
                        percentage >= 60 ? 'bg-warning-500' : 'bg-danger-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Areas to Reteach */}
        {areasToReteach.length > 0 && (
          <div className="mt-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-5 w-5 text-warning-600" />
              <h4 className="font-medium text-warning-800">Areas Needing Attention</h4>
            </div>
            <p className="text-sm text-warning-700 mb-2">
              The following criteria scored below 50% and may need reteaching:
            </p>
            <ul className="list-disc list-inside text-sm text-warning-700 space-y-1">
              {areasToReteach.map((criterion, index) => (
                <li key={index}>
                  {criterion.criterion} ({Math.round((criterion.avgScore / criterion.maxScore) * 100)}%)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentPerformance;
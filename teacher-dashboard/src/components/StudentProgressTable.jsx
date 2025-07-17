import React from 'react';
import { TrendingUp, TrendingDown, Minus, Mail, AlertTriangle } from 'lucide-react';

const StudentProgressTable = ({ students, filter, onFilterChange }) => {
  // Filter students based on selected filter
  const filteredStudents = students.filter(student => {
    if (filter === 'All') return true;
    return student.status === filter;
  });

  // Sort students by average score (descending)
  const sortedStudents = [...filteredStudents].sort((a, b) => b.avgScore - a.avgScore);

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-success-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-danger-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "status-badge";
    switch (status) {
      case 'Excelling':
        return `${baseClasses} status-excelling`;
      case 'On Track':
        return `${baseClasses} status-on-track`;
      case 'At Risk':
        return `${baseClasses} status-at-risk`;
      default:
        return `${baseClasses} status-failing`;
    }
  };

  const filterOptions = ['All', 'Excelling', 'On Track', 'At Risk'];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Student Progress Tracker</h2>
        
        {/* Filter Buttons */}
        <div className="flex space-x-2">
          {filterOptions.map(option => (
            <button
              key={option}
              onClick={() => onFilterChange(option)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filter === option
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option}
              {option !== 'All' && (
                <span className="ml-1 text-xs">
                  ({students.filter(s => s.status === option).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Students at Risk Alert */}
      {filter === 'At Risk' && filteredStudents.length > 0 && (
        <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-warning-600" />
            <p className="text-sm font-medium text-warning-800">
              {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} need{filteredStudents.length === 1 ? 's' : ''} immediate attention
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Average Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trend
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStudents.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {student.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {student.email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {student.avgScore.toFixed(1)}%
                    </span>
                    {/* Mini progress bar */}
                    <div className="ml-3 w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          student.avgScore >= 90 ? 'bg-success-500' :
                          student.avgScore >= 80 ? 'bg-primary-500' :
                          student.avgScore >= 70 ? 'bg-warning-500' : 'bg-danger-500'
                        }`}
                        style={{ width: `${Math.min(student.avgScore, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(student.trend)}
                    <span className="text-sm text-gray-600 capitalize">
                      {student.trend}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getStatusBadge(student.status)}>
                    {student.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      className="text-primary-600 hover:text-primary-900 font-medium"
                      title="View Details"
                    >
                      View
                    </button>
                    <button
                      className="text-gray-600 hover:text-gray-900"
                      title="Send Email"
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No students found for the selected filter.
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{filteredStudents.length}</p>
            <p className="text-sm text-gray-600">Students Shown</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {filteredStudents.length > 0 
                ? (filteredStudents.reduce((sum, s) => sum + s.avgScore, 0) / filteredStudents.length).toFixed(1)
                : '0'
              }%
            </p>
            <p className="text-sm text-gray-600">Average Score</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {filteredStudents.filter(s => s.trend === 'up').length}
            </p>
            <p className="text-sm text-gray-600">Improving</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProgressTable;
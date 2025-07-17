import React, { useState } from 'react';
import { 
  BookOpen, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Target,
  Calendar,
  Award,
  BarChart3
} from 'lucide-react';
import AssignmentPerformance from './AssignmentPerformance';
import StudentProgressTable from './StudentProgressTable';
import BenchmarkReadinessChart from './BenchmarkReadinessChart';

// Import mock data
import assignmentsData from '../data/mockAssignments.json';
import studentsData from '../data/mockStudentGrades.json';
import benchmarkData from '../data/mockBenchmarkData.json';

const ClassInsightsDashboard = () => {
  const [selectedAssignment, setSelectedAssignment] = useState(assignmentsData.assignments[0]);
  const [studentFilter, setStudentFilter] = useState('All');

  // Calculate class overview stats
  const classStats = {
    totalStudents: studentsData.students.length,
    classAverage: Math.round(studentsData.students.reduce((sum, student) => sum + student.avgScore, 0) / studentsData.students.length * 10) / 10,
    excellingCount: studentsData.students.filter(s => s.status === 'Excelling').length,
    atRiskCount: studentsData.students.filter(s => s.status === 'At Risk').length,
    onTrackCount: studentsData.students.filter(s => s.status === 'On Track').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <BookOpen className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Class Insights Dashboard</h1>
                <p className="text-gray-600">Biology 101 - Spring 2024</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Last updated: March 15, 2024</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">{classStats.totalStudents}</p>
              </div>
              <div className="p-3 bg-primary-100 rounded-lg">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Class Average</p>
                <p className="text-3xl font-bold text-gray-900">{classStats.classAverage}%</p>
              </div>
              <div className="p-3 bg-success-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Excelling</p>
                <p className="text-3xl font-bold text-success-600">{classStats.excellingCount}</p>
                <p className="text-xs text-gray-500">students</p>
              </div>
              <div className="p-3 bg-success-100 rounded-lg">
                <Award className="h-6 w-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">At Risk</p>
                <p className="text-3xl font-bold text-warning-600">{classStats.atRiskCount}</p>
                <p className="text-xs text-gray-500">students</p>
              </div>
              <div className="p-3 bg-warning-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-warning-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Assignment Performance */}
          <div className="lg:col-span-2 space-y-8">
            <AssignmentPerformance 
              assignments={assignmentsData.assignments}
              selectedAssignment={selectedAssignment}
              onAssignmentSelect={setSelectedAssignment}
            />
            
            <StudentProgressTable 
              students={studentsData.students}
              filter={studentFilter}
              onFilterChange={setStudentFilter}
            />
          </div>

          {/* Right Column - Benchmark Readiness */}
          <div className="space-y-8">
            <BenchmarkReadinessChart 
              benchmarkData={benchmarkData}
            />
            
            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full btn-primary justify-center">
                  <Target className="h-4 w-4 mr-2" />
                  Create Intervention Plan
                </button>
                <button className="w-full btn-secondary justify-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Export Progress Report
                </button>
                <button className="w-full btn-secondary justify-center">
                  <Users className="h-4 w-4 mr-2" />
                  Schedule Parent Conferences
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClassInsightsDashboard;
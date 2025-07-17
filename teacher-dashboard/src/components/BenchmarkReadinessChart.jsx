import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Target, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const BenchmarkReadinessChart = ({ benchmarkData }) => {
  const { 
    classProjection, 
    targetScore, 
    projectedScore, 
    improvementNeeded, 
    classStats,
    skillAreas 
  } = benchmarkData;

  // Calculate if class is on track
  const isOnTrack = projectedScore >= targetScore;
  const gapFromTarget = targetScore - projectedScore;

  const getSkillStatusIcon = (status) => {
    switch (status) {
      case 'exceeding':
        return <CheckCircle className="h-4 w-4 text-success-600" />;
      case 'on_track':
        return <Clock className="h-4 w-4 text-primary-600" />;
      case 'needs_improvement':
        return <AlertCircle className="h-4 w-4 text-warning-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-danger-600" />;
    }
  };

  const getSkillStatusColor = (status) => {
    switch (status) {
      case 'exceeding':
        return 'text-success-700 bg-success-50 border-success-200';
      case 'on_track':
        return 'text-primary-700 bg-primary-50 border-primary-200';
      case 'needs_improvement':
        return 'text-warning-700 bg-warning-50 border-warning-200';
      default:
        return 'text-danger-700 bg-danger-50 border-danger-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Benchmark Readiness Overview */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Target className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Benchmark Readiness</h2>
        </div>

        {/* Status Alert */}
        <div className={`p-4 rounded-lg border mb-6 ${
          isOnTrack 
            ? 'bg-success-50 border-success-200' 
            : 'bg-warning-50 border-warning-200'
        }`}>
          <div className="flex items-center space-x-2">
            {isOnTrack ? (
              <CheckCircle className="h-5 w-5 text-success-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-warning-600" />
            )}
            <div>
              <p className={`font-medium ${
                isOnTrack ? 'text-success-800' : 'text-warning-800'
              }`}>
                {isOnTrack 
                  ? 'Class is on track for benchmark!' 
                  : `Class is ${gapFromTarget.toFixed(1)} points below target`
                }
              </p>
              <p className={`text-sm ${
                isOnTrack ? 'text-success-700' : 'text-warning-700'
              }`}>
                Projected score: {projectedScore}% | Target: {targetScore}%
              </p>
            </div>
          </div>
        </div>

        {/* Progress Chart */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Class Progress Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={classProjection} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  tickFormatter={(value) => `Week ${value}`}
                />
                <YAxis domain={[60, 100]} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Class Average']}
                  labelFormatter={(label) => `Week ${label}`}
                />
                <ReferenceLine 
                  y={targetScore} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  label={{ value: `Target: ${targetScore}%`, position: "topRight" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgScore" 
                  stroke="#0ea5e9" 
                  strokeWidth={3}
                  dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Class Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-success-600">{classStats.excellingStudents}</p>
            <p className="text-sm text-gray-600">Excelling</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-primary-600">{classStats.onTrackStudents}</p>
            <p className="text-sm text-gray-600">On Track</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-warning-600">{classStats.atRiskStudents}</p>
            <p className="text-sm text-gray-600">At Risk</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">+{classStats.averageImprovement}%</p>
            <p className="text-sm text-gray-600">Avg Growth</p>
          </div>
        </div>
      </div>

      {/* Skill Areas Breakdown */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Skill Areas Assessment</h3>
        <div className="space-y-3">
          {skillAreas.map((skill, index) => {
            const progress = (skill.currentLevel / skill.targetLevel) * 100;
            return (
              <div key={index} className={`p-3 rounded-lg border ${getSkillStatusColor(skill.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getSkillStatusIcon(skill.status)}
                    <span className="font-medium">{skill.skill}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {skill.currentLevel}% / {skill.targetLevel}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      skill.status === 'exceeding' ? 'bg-success-500' :
                      skill.status === 'on_track' ? 'bg-primary-500' :
                      'bg-warning-500'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
        <div className="space-y-3">
          {!isOnTrack && (
            <div className="flex items-start space-x-3 p-3 bg-warning-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-warning-600 mt-0.5" />
              <div>
                <p className="font-medium text-warning-800">Focus on Low-Performing Areas</p>
                <p className="text-sm text-warning-700">
                  Prioritize {skillAreas.filter(s => s.status === 'needs_improvement').length} skill areas 
                  that need improvement to reach benchmark targets.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-start space-x-3 p-3 bg-primary-50 rounded-lg">
            <Target className="h-5 w-5 text-primary-600 mt-0.5" />
            <div>
              <p className="font-medium text-primary-800">Targeted Interventions</p>
              <p className="text-sm text-primary-700">
                Consider small group instruction for the {classStats.atRiskStudents} at-risk students 
                to accelerate their progress.
              </p>
            </div>
          </div>

          {classStats.excellingStudents > 0 && (
            <div className="flex items-start space-x-3 p-3 bg-success-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-success-600 mt-0.5" />
              <div>
                <p className="font-medium text-success-800">Enrichment Opportunities</p>
                <p className="text-sm text-success-700">
                  Provide advanced challenges for {classStats.excellingStudents} excelling students 
                  to maintain engagement and growth.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BenchmarkReadinessChart;
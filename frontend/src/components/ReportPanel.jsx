import React, { useState } from 'react';
import { 
  Sparkles, Award, Zap, ShieldAlert, Cpu, 
  BookOpen, ChevronRight, HelpCircle, CheckCircle2 
} from 'lucide-react';

const ReportPanel = ({ report, isRunning }) => {
  const [activeTab, setActiveTab] = useState('summary');

  if (isRunning) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center py-16 px-6 text-center h-full">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-brand-violet/20 border-t-brand-violet animate-spin"></div>
          <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-brand-violet animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Generating Engineering Review...</h3>
        <p className="text-xs text-gray-400 max-w-sm">
          Our 6 AI engineering agents are reviewing your submission for complexities, bugs, security risks, and optimization paths.
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center py-16 px-6 text-center h-full text-gray-500">
        <Sparkles className="w-12 h-12 mb-3 opacity-25 text-brand-violet" />
        <h3 className="text-sm font-semibold text-gray-300">AI Report Panel</h3>
        <p className="text-xs mt-1 max-w-xs">Run code successfully to get a senior software engineer style review of your code.</p>
      </div>
    );
  }

  // Helper for scoring colors
  const getScoreColor = (score) => {
    if (score >= 90) return 'text-brand-emerald';
    if (score >= 70) return 'text-brand-glow';
    if (score >= 50) return 'text-warning';
    return 'text-brand-rose';
  };

  const getScoreBg = (score) => {
    if (score >= 90) return 'bg-brand-emerald/10 border-brand-emerald/20';
    if (score >= 70) return 'bg-brand-glow/10 border-brand-glow/20';
    if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-brand-rose/10 border-brand-rose/20';
  };

  const scoreColorClass = getScoreColor(report.engineering_score);
  const scoreBgClass = getScoreBg(report.engineering_score);

  return (
    <div className="glass-panel flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      {/* Tab Select Header */}
      <div className="flex items-center justify-between bg-black/40 border-b border-brand-border select-none">
        <div className="flex text-sm font-medium overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-3.5 border-b-2 whitespace-nowrap transition-all duration-300 ${
              activeTab === 'summary' 
                ? 'border-brand-violet text-white bg-white/5' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Summary & Complexity
          </button>
          <button
            onClick={() => setActiveTab('optimization')}
            className={`px-4 py-3.5 border-b-2 whitespace-nowrap transition-all duration-300 ${
              activeTab === 'optimization' 
                ? 'border-brand-violet text-white bg-white/5' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Optimizations
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`px-4 py-3.5 border-b-2 whitespace-nowrap transition-all duration-300 ${
              activeTab === 'quality' 
                ? 'border-brand-violet text-white bg-white/5' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Code Quality
          </button>
          <button
            onClick={() => setActiveTab('risks')}
            className={`px-4 py-3.5 border-b-2 whitespace-nowrap transition-all duration-300 ${
              activeTab === 'risks' 
                ? 'border-brand-violet text-white bg-white/5' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Security & Risks
          </button>
          <button
            onClick={() => setActiveTab('learning')}
            className={`px-4 py-3.5 border-b-2 whitespace-nowrap transition-all duration-300 ${
              activeTab === 'learning' 
                ? 'border-brand-violet text-white bg-white/5' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Learning Path
          </button>
        </div>
      </div>

      {/* Report Content Panel */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* TAB 1: SUMMARY & COMPLEXITY */}
        {activeTab === 'summary' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Score Ring Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`col-span-1 p-4 rounded-xl border flex flex-col items-center justify-center text-center ${scoreBgClass}`}>
                <span className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-1">Engineering Score</span>
                <span className={`text-4xl font-extrabold ${scoreColorClass}`}>
                  {report.engineering_score}
                </span>
                <span className="text-[10px] mt-1 text-gray-500 font-medium">Out of 100</span>
              </div>

              <div className="col-span-1 p-4 rounded-xl border border-brand-border bg-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-1">Time Complexity</span>
                <span className="text-xl font-bold text-brand-glow font-mono">
                  {report.time_complexity}
                </span>
                <span className="text-[10px] mt-1 text-gray-500 font-medium">Estimated Runtime Bounds</span>
              </div>

              <div className="col-span-1 p-4 rounded-xl border border-brand-border bg-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-1">Space Complexity</span>
                <span className="text-xl font-bold text-brand-emerald font-mono">
                  {report.space_complexity}
                </span>
                <span className="text-[10px] mt-1 text-gray-500 font-medium">Memory Allocation Footprint</span>
              </div>
            </div>

            {/* Complexity Reasoning */}
            <div className="p-4 rounded-xl border border-brand-border bg-black/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-brand-glow" />
                Complexity Analysis Reasoning
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed font-sans">{report.complexity_reasoning}</p>
            </div>

            {/* Micro-agents Checklist */}
            <div className="p-4 rounded-xl border border-brand-border bg-black/10 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
                Multi-Agent Verification Status
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                <div className="flex items-center gap-2 px-3 py-2 bg-black/30 border border-brand-border rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald shadow-[0_0_8px_#10b981]"></span>
                  <span>Complexity Analyzer Completed</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-black/30 border border-brand-border rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald shadow-[0_0_8px_#10b981]"></span>
                  <span>Code Reviewer Verified</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-black/30 border border-brand-border rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald shadow-[0_0_8px_#10b981]"></span>
                  <span>Bug Detection Completed</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-black/30 border border-brand-border rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald shadow-[0_0_8px_#10b981]"></span>
                  <span>Security Sandbox Scan Done</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OPTIMIZATIONS */}
        {activeTab === 'optimization' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Strategy Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-brand-border bg-brand-rose/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-rose/80 mb-1.5">Current Strategy</h4>
                <p className="text-sm font-semibold text-gray-200 font-sans">{report.current_approach || 'Basic compiler output.'}</p>
              </div>
              <div className="p-4 rounded-xl border border-brand-emerald/20 bg-brand-emerald/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-emerald/80 mb-1.5 font-sans">Optimal Strategy</h4>
                <p className="text-sm font-semibold text-gray-200">{report.optimal_approach || 'Optimize time loops.'}</p>
              </div>
            </div>

            {/* List of optimization items */}
            <div className="p-4 rounded-xl border border-brand-border bg-black/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-warning" />
                Senior Developer Refactoring Recommendations
              </h4>
              {report.optimization_suggestions && report.optimization_suggestions.length > 0 ? (
                <ul className="space-y-2 text-sm text-gray-300 font-sans">
                  {report.optimization_suggestions.map((sug, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="mt-1 text-brand-glow">•</span>
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No optimization suggestions provided. Your algorithm is efficient!</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CODE QUALITY */}
        {activeTab === 'quality' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Score Sliders */}
            <div className="p-4 rounded-xl border border-brand-border bg-black/30 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-brand-violet" />
                Code Quality Metric Scores
              </h4>
              
              {/* Readability */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-300">Readability & Naming</span>
                  <span className={getScoreColor(report.readability_score)}>{report.readability_score}/100</span>
                </div>
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-violet rounded-full transition-all duration-500" 
                    style={{ width: `${report.readability_score}%` }}
                  ></div>
                </div>
              </div>

              {/* Maintainability */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-300">Maintainability & Modularity</span>
                  <span className={getScoreColor(report.maintainability_score)}>{report.maintainability_score}/100</span>
                </div>
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-glow rounded-full transition-all duration-500" 
                    style={{ width: `${report.maintainability_score}%` }}
                  ></div>
                </div>
              </div>

              {/* Best Practices */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-300">Engineering Best Practices</span>
                  <span className={getScoreColor(report.best_practices_score)}>{report.best_practices_score}/100</span>
                </div>
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-emerald rounded-full transition-all duration-500" 
                    style={{ width: `${report.best_practices_score}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="p-4 rounded-xl border border-brand-border bg-black/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                Style & Standards suggestions
              </h4>
              {report.code_quality_suggestions && report.code_quality_suggestions.length > 0 ? (
                <ul className="space-y-2 text-sm text-gray-300">
                  {report.code_quality_suggestions.map((sug, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 text-brand-emerald">•</span>
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No quality comments. Clean code!</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: RISKS & SECURITY */}
        {activeTab === 'risks' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Bug Analysis */}
            <div className="p-4 rounded-xl border border-brand-border bg-black/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-brand-rose" />
                Edge Case & Bug Analysis
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed">{report.bug_analysis || "No core logical bugs detected."}</p>
            </div>

            {/* Edge Cases */}
            <div className="p-4 rounded-xl border border-brand-border bg-black/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Unchecked Edge Cases
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed">{report.edge_cases || "Handles edge cases cleanly."}</p>
            </div>

            {/* Security Audit */}
            <div className={`p-4 rounded-xl border ${report.security_issues && report.security_issues.toLowerCase().includes('warning') ? 'bg-brand-rose/5 border-brand-rose/20' : 'bg-black/30 border-brand-border'}`}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Security Analysis
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed">{report.security_issues || "No security buffer issues found."}</p>
            </div>
          </div>
        )}

        {/* TAB 5: LEARNING PATH */}
        {activeTab === 'learning' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Concepts Used */}
            <div className="p-4 rounded-xl border border-brand-border bg-black/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-brand-emerald" />
                Core Concepts Discovered in Code
              </h4>
              <div className="flex flex-wrap gap-2">
                {report.concepts_used && report.concepts_used.length > 0 ? (
                  report.concepts_used.map((concept, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20">
                      {concept}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500 italic">No topics extracted.</span>
                )}
              </div>
            </div>

            {/* Suggested topics roadmap */}
            <div className="p-4 rounded-xl border border-brand-border bg-black/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Topics to Review Next
              </h4>
              <div className="space-y-2">
                {report.suggested_topics && report.suggested_topics.length > 0 ? (
                  report.suggested_topics.map((topic, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                      <ChevronRight className="w-4 h-4 text-brand-violet" />
                      <span>{topic}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">Excellent! You are on an advanced path.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportPanel;

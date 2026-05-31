import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  BarChart, LayoutDashboard, Code, Clock, 
  TrendingUp, Award, Zap, ChevronRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    axios.get('http://localhost:8000/api/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setData(res.data);
    })
    .catch(err => {
      setError('Failed to fetch dashboard metrics.');
      console.error(err);
    })
    .finally(() => {
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-brand-glow/20 border-t-brand-glow animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center select-none">
        <div className="glass-panel py-16 px-6">
          <TrendingUp className="w-12 h-12 mx-auto text-brand-rose opacity-40 mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Metrics Unavailable</h3>
          <p className="text-sm text-gray-400 mb-6">{error || 'Please run some programs first to populate dashboard metrics.'}</p>
          <Link to="/" className="glass-btn-primary mx-auto inline-flex">Go to Workspace</Link>
        </div>
      </div>
    );
  }

  // Handle empty submissions state
  if (data.total_runs === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center select-none">
        <div className="glass-panel py-16 px-6">
          <TrendingUp className="w-12 h-12 mx-auto text-brand-glow opacity-40 mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">No Submissions Yet</h3>
          <p className="text-sm text-gray-400 mb-6">Your dashboard metrics will be generated once you submit code for analysis.</p>
          <Link to="/" className="glass-btn-primary mx-auto inline-flex">Start Coding Workspace</Link>
        </div>
      </div>
    );
  }

  // Helper: custom SVG Line Chart generator
  const renderTrendChart = (trend) => {
    if (!trend || trend.length < 2) {
      return (
        <div className="h-48 flex items-center justify-center text-gray-500 text-xs italic">
          More runs needed to draw improvement trends.
        </div>
      );
    }

    // Chart parameters
    const width = 600;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 20;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Find min/max scores (clamp min to 0, max to 100)
    const maxScore = 100;
    const minScore = 0;

    // Generate coordinate paths
    const points = trend.map((t, idx) => {
      const x = paddingLeft + (idx / (trend.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - ((t.score - minScore) / (maxScore - minScore)) * chartHeight;
      return { x, y, ...t };
    });

    const pathData = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaData = `${pathData} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((score) => {
            const y = paddingTop + chartHeight - (score / 100) * chartHeight;
            return (
              <g key={score}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <text x={paddingLeft - 8} y={y + 4} fill="rgba(156,163,175,0.5)" fontSize="9" textAnchor="end">{score}</text>
              </g>
            );
          })}

          {/* Shaded Area under path */}
          <path d={areaData} fill="url(#chartGradient)" />

          {/* Main Line */}
          <path d={pathData} fill="none" stroke="url(#lineGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((p, idx) => (
            <g key={idx} className="group">
              <circle cx={p.x} cy={p.y} r="4" className="fill-brand-bg stroke-brand-glow stroke-2 hover:r-5 cursor-pointer transition-all duration-200" />
              <title>{`${p.date}: ${p.score} pts`}</title>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const getLanguageColor = (lang) => {
    switch (lang.toLowerCase()) {
      case 'cpp': return 'bg-blue-500';
      case 'c': return 'bg-sky-400';
      case 'python': return 'bg-yellow-500';
      case 'java': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 select-none space-y-6">
      
      {/* Dashboard Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-brand-glow" />
            Engineering Dashboard
          </h1>
          <p className="text-xs text-gray-400 mt-1">Analytics review of your algorithms, complexities, and code scores.</p>
        </div>
      </div>

      {/* Grid: 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Submissions Card */}
        <div className="glass-panel p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="bg-brand-glow/10 p-3.5 rounded-xl border border-brand-glow/20">
            <Code className="w-5 h-5 text-brand-glow" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Runs</span>
            <h3 className="text-2xl font-extrabold text-white leading-none mt-1">{data.total_runs}</h3>
          </div>
        </div>

        {/* Avg Code Score Card */}
        <div className="glass-panel p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="bg-brand-emerald/10 p-3.5 rounded-xl border border-brand-emerald/20">
            <Award className="w-5 h-5 text-brand-emerald" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Avg Code Score</span>
            <h3 className="text-2xl font-extrabold text-white leading-none mt-1">{data.average_engineering_score} <span className="text-xs font-semibold text-gray-400">/ 100</span></h3>
          </div>
        </div>

        {/* Language Breakdown Card */}
        <div className="glass-panel p-5 flex flex-col justify-center min-h-[82px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Primary Language Shares</span>
          <div className="flex gap-1.5 h-2 w-full bg-gray-800 rounded-full overflow-hidden">
            {Object.entries(data.languages_used).map(([lang, count]) => {
              const widthPct = (count / data.total_runs) * 100;
              return (
                <div 
                  key={lang} 
                  className={`h-full ${getLanguageColor(lang)}`}
                  style={{ width: `${widthPct}%` }}
                  title={`${lang.toUpperCase()}: ${count} runs (${widthPct.toFixed(0)}%)`}
                ></div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-gray-400 font-semibold uppercase">
            {Object.entries(data.languages_used).map(([lang, count]) => (
              <div key={lang} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${getLanguageColor(lang)}`}></span>
                <span>{lang.toUpperCase()} ({count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Frequent Complexity Card */}
        <div className="glass-panel p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="bg-brand-violet/10 p-3.5 rounded-xl border border-brand-violet/20">
            <Zap className="w-5 h-5 text-brand-violet" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Avg Time Complexity</span>
            <h3 className="text-lg font-bold text-white mt-1.5 font-mono">
              {Object.keys(data.average_complexity).sort((a,b) => data.average_complexity[b] - data.average_complexity[a])[0] || 'N/A'}
            </h3>
          </div>
        </div>

      </div>

      {/* Row 2: Analytics graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Trend line graph card (takes 8 cols) */}
        <div className="lg:col-span-8 glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-glow" />
              Coding Improvement Trend
            </h3>
            <span className="text-[10px] text-gray-500 font-semibold uppercase">Average score over runs</span>
          </div>
          {renderTrendChart(data.coding_improvement_trend)}
        </div>

        {/* Complexity Distribution vertical bar chart (takes 4 cols) */}
        <div className="lg:col-span-4 glass-panel p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <BarChart className="w-4 h-4 text-brand-violet" />
              Complexity Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(data.average_complexity).map(([comp, count]) => {
                const maxCount = Math.max(...Object.values(data.average_complexity));
                const pct = (count / maxCount) * 100;
                return (
                  <div key={comp} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold font-mono text-gray-300">
                      <span>{comp}</span>
                      <span className="text-gray-400 font-sans">{count} runs</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-violet rounded-full" 
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-sans italic leading-tight">Complexity classes parsed automatically from submission history reviews.</p>
        </div>

      </div>

      {/* Row 3: Recent Reports List */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-emerald" />
            Recent Reports
          </h3>
          <Link to="/history" className="text-xs text-brand-glow hover:underline flex items-center gap-1">
            View All History
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        {/* Simple responsive table for recent runs */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-gray-400">
            <thead>
              <tr className="border-b border-brand-border text-gray-500 uppercase tracking-wider select-none text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Language</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-center">Score</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_reports.map((report) => (
                <tr key={report.id} className="border-b border-brand-border hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-gray-300 font-medium">
                    {new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-3 uppercase text-gray-300 font-semibold">{report.language}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                      report.status === 'Success' 
                        ? 'bg-brand-emerald/10 text-brand-emerald' 
                        : 'bg-brand-rose/10 text-brand-rose'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className={`py-3 px-3 text-center font-bold ${
                    report.engineering_score >= 90 ? 'text-brand-emerald' : report.engineering_score >= 70 ? 'text-brand-glow' : 'text-warning'
                  }`}>
                    {report.engineering_score ?? '--'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link 
                      to={`/history?select=${report.id}`} 
                      className="glass-btn-secondary py-1 px-2.5 text-[10px] font-bold inline-flex"
                    >
                      Open Report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;

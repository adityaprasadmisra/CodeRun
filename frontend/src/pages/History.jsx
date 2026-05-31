import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Terminal, Clock, History, AlertTriangle, Code, ArrowLeft } from 'lucide-react';
import ReportPanel from '../components/ReportPanel';

const HistoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [selectedCode, setSelectedCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  // Load history list
  useEffect(() => {
    fetchHistory();
  }, [token]);

  const fetchHistory = () => {
    setLoading(true);
    axios.get('http://localhost:8000/api/submissions', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setSubmissions(res.data);
      
      // Auto-select submission if query parameter exists, otherwise select the first one
      const selectId = searchParams.get('select');
      if (selectId && res.data.length > 0) {
        handleSelectSubmission(selectId);
      } else if (res.data.length > 0) {
        handleSelectSubmission(res.data[0].id);
      }
    })
    .catch(err => {
      setError('Failed to load submission history.');
      console.error(err);
    })
    .finally(() => {
      setLoading(false);
    });
  };

  const handleSelectSubmission = async (id) => {
    setDetailLoading(true);
    setSearchParams({ select: id });
    try {
      const res = await axios.get(`http://localhost:8000/api/submissions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedSub(res.data);
      setSelectedCode(res.data.code);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-brand-glow/20 border-t-brand-glow animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 select-none space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-brand-glow" />
          Submission Logs & Reviews
        </h1>
        <p className="text-xs text-gray-400 mt-1">Review all your compiled codes and corresponding senior engineer AI analysis reports.</p>
      </div>

      {submissions.length === 0 ? (
        <div className="glass-panel py-16 px-6 text-center text-gray-500">
          <History className="w-12 h-12 mx-auto opacity-30 text-gray-400 mb-3" />
          <h3 className="text-sm font-semibold text-gray-300">No Submissions Found</h3>
          <p className="text-xs mt-1">Submit code in the compiler editor workspace to write logs here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Panel: Submission lists table (takes 4 columns) */}
          <div className="lg:col-span-4 glass-panel overflow-hidden flex flex-col h-[calc(100vh-190px)] min-h-[300px]">
            <div className="px-4 py-3 bg-black/40 border-b border-brand-border select-none text-xs font-bold uppercase tracking-wider text-gray-400">
              Run History ({submissions.length})
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-brand-border">
              {submissions.map((sub) => {
                const isSelected = selectedSub && selectedSub.id === sub.id;
                return (
                  <div
                    key={sub.id}
                    onClick={() => handleSelectSubmission(sub.id)}
                    className={`p-4 cursor-pointer transition-all duration-200 hover:bg-white/5 flex justify-between items-start gap-3 ${
                      isSelected ? 'bg-white/5 border-l-2 border-brand-violet' : ''
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-semibold text-gray-300">{sub.language}</span>
                        <span className={`px-1.5 py-0.5 rounded font-semibold text-[8px] uppercase tracking-wide ${
                          sub.status === 'Success' 
                            ? 'bg-brand-emerald/10 text-brand-emerald' 
                            : 'bg-brand-rose/10 text-brand-rose'
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium font-sans">
                        {new Date(sub.created_at).toLocaleDateString()} {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Engineering Score badge */}
                    {sub.engineering_score !== null && (
                      <div className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold flex flex-col items-center justify-center ${
                        sub.engineering_score >= 90 ? 'bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20' : sub.engineering_score >= 70 ? 'bg-brand-glow/10 text-brand-glow border border-brand-glow/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                      }`}>
                        <span className="text-[7px] text-gray-500 uppercase font-semibold">Score</span>
                        <span className="leading-none mt-0.5">{sub.engineering_score}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Detail split workspace (takes 8 columns) */}
          <div className="lg:col-span-8 flex flex-col gap-6 h-[calc(100vh-190px)]">
            {detailLoading ? (
              <div className="glass-panel flex-1 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-glow/30 border-t-brand-glow animate-spin"></div>
              </div>
            ) : selectedSub ? (
              <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
                {/* Side A: Code & Console output split (takes 45% width inside A+B) */}
                <div className="xl:w-[45%] flex flex-col gap-6 min-h-0 h-full">
                  {/* Source code viewer */}
                  <div className="flex-1 glass-panel overflow-hidden flex flex-col min-h-[150px]">
                    <div className="px-4 py-3 bg-black/40 border-b border-brand-border flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                      <Code className="w-4 h-4 text-brand-glow" />
                      <span>Code Submission Viewer</span>
                    </div>
                    <pre className="flex-1 p-4 bg-gray-950/80 font-mono text-[11px] leading-relaxed text-gray-300 overflow-auto select-text">
                      <code>{selectedCode}</code>
                    </pre>
                  </div>
                  
                  {/* Execution Output console */}
                  <div className="h-[30%] min-h-[100px] glass-panel overflow-hidden flex flex-col bg-black">
                    <div className="px-4 py-2 border-b border-brand-border bg-white/5 select-none text-[10px] uppercase font-bold tracking-wider text-gray-500">
                      Execution Console Output
                    </div>
                    <div className="flex-1 p-3 font-mono text-[11px] overflow-auto select-text">
                      {selectedSub.status === 'Compile Error' ? (
                        <span className="text-brand-rose">{selectedSub.error}</span>
                      ) : selectedSub.status === 'Runtime Error' ? (
                        <span className="text-brand-rose">{selectedSub.error}</span>
                      ) : selectedSub.status === 'Timeout' ? (
                        <span className="text-yellow-500">{selectedSub.error}</span>
                      ) : (
                        <span className="text-brand-emerald">{selectedSub.output || <span className="text-gray-600 italic">Empty output.</span>}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Side B: AI report card panel (takes 55% width inside A+B) */}
                <div className="xl:w-[55%] min-h-0 h-full">
                  <ReportPanel report={selectedSub.report} isRunning={false} />
                </div>
              </div>
            ) : (
              <div className="glass-panel flex-1 flex items-center justify-center text-gray-500 text-xs">
                Select a submission to review the details
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default HistoryPage;

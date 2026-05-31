import React from 'react';
import { Terminal, Cpu, Clock, AlertTriangle } from 'lucide-react';

const OutputPanel = ({ result, isRunning }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Success':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20">Success</span>;
      case 'Compile Error':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-rose/10 text-brand-rose border border-brand-rose/20">Compile Error</span>;
      case 'Runtime Error':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-rose/10 text-brand-rose border border-brand-rose/20">Runtime Error</span>;
      case 'Timeout':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Timeout</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-400">Idle</span>;
    }
  };

  const hasOutput = result && (result.output || result.error || result.status);

  return (
    <div className="glass-panel flex flex-col h-full overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-brand-border select-none">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
          <Terminal className="w-4 h-4 text-brand-glow" />
          <span>Execution Output</span>
        </div>
        {result && getStatusBadge(result.status)}
      </div>

      {/* Metrics Row */}
      {result && result.status !== 'Idle' && (
        <div className="grid grid-cols-2 border-b border-brand-border bg-black/20 text-xs text-gray-400 font-medium">
          <div className="flex items-center gap-2 px-4 py-2.5 border-r border-brand-border">
            <Clock className="w-3.5 h-3.5 text-brand-glow" />
            <span>Time: <strong className="text-gray-200">{result.execution_time_ms ?? '--'} ms</strong></span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5">
            <Cpu className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Memory: <strong className="text-gray-200">{(result.memory_usage_kb ? (result.memory_usage_kb / 1024).toFixed(2) : '--')} MB</strong></span>
          </div>
        </div>
      )}

      {/* Console Output Screen */}
      <div className="flex-1 bg-black/95 p-4 font-mono text-sm overflow-auto min-h-[150px] relative">
        {isRunning ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
            <div className="w-8 h-8 rounded-full border-2 border-brand-glow/30 border-t-brand-glow animate-spin"></div>
            <span className="text-xs text-gray-400 font-sans tracking-wide animate-pulse">Running compilation & sandboxed execution...</span>
          </div>
        ) : !hasOutput ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 font-sans">
            <Terminal className="w-10 h-10 mb-2 opacity-30 text-gray-400" />
            <p className="text-xs">Submit code to compile and view results</p>
          </div>
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed select-text">
            {result.status === 'Compile Error' ? (
              <span className="text-brand-rose block">
                <AlertTriangle className="w-4 h-4 inline mr-1.5 mb-1" />
                <strong>Compilation Failed:</strong>{"\n"}
                {result.error}
              </span>
            ) : result.status === 'Runtime Error' ? (
              <span className="text-brand-rose block">
                <AlertTriangle className="w-4 h-4 inline mr-1.5 mb-1" />
                <strong>Runtime Error:</strong>{"\n"}
                {result.error}
              </span>
            ) : result.status === 'Timeout' ? (
              <span className="text-yellow-500 block">
                <AlertTriangle className="w-4 h-4 inline mr-1.5 mb-1" />
                <strong>Timeout Exceeded:</strong>{"\n"}
                {result.error}
              </span>
            ) : (
              <span className="text-brand-emerald block">
                {result.output || <span className="text-gray-600 italic">Program executed successfully with empty output.</span>}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;

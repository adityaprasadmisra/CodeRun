import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Cpu, Clock, AlertTriangle, CornerDownLeft, Square } from 'lucide-react';

const OutputPanel = ({ output, result, isRunning, phase, onSendInput, onStop }) => {
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState('');

  const canInput = isRunning && phase === 'running';

  // Auto-scroll the console to the bottom as new output streams in.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output, canInput]);

  // Focus the input line the moment the program starts asking for input.
  useEffect(() => {
    if (canInput && inputRef.current) inputRef.current.focus();
  }, [canInput]);

  const submitInput = () => {
    onSendInput(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitInput();
    }
  };

  const getStatusBadge = () => {
    if (isRunning) {
      const label =
        phase === 'compiling' ? 'Compiling' :
        phase === 'running' ? 'Running · Live' :
        phase === 'reviewing' ? 'AI Reviewing' : 'Working';
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-glow/10 text-brand-glow border border-brand-glow/20 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-glow animate-pulse"></span>
          {label}
        </span>
      );
    }
    switch (result?.status) {
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

  const isErrorStatus = result && ['Compile Error', 'Runtime Error', 'Timeout'].includes(result.status);
  const errorLabel =
    result?.status === 'Compile Error' ? 'Compilation Failed:' :
    result?.status === 'Runtime Error' ? 'Runtime Error:' :
    result?.status === 'Timeout' ? 'Timeout Exceeded:' : 'Error:';
  const errorColor = result?.status === 'Timeout' ? 'text-yellow-500' : 'text-brand-rose';

  const hasAnything = output || result;

  return (
    <div className="glass-panel flex flex-col h-full overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-brand-border select-none">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
          <Terminal className="w-4 h-4 text-brand-glow" />
          <span>Execution Output</span>
        </div>
        <div className="flex items-center gap-2">
          {canInput && (
            <button
              onClick={onStop}
              title="Stop execution"
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-brand-rose/10 text-brand-rose border border-brand-rose/20 hover:bg-brand-rose/20 transition-colors"
            >
              <Square className="w-3 h-3" /> Stop
            </button>
          )}
          {getStatusBadge()}
        </div>
      </div>

      {/* Metrics Row (only after a run completes) */}
      {result && result.status !== 'Idle' && result.execution_time_ms != null && (
        <div className="grid grid-cols-2 border-b border-brand-border bg-black/20 text-xs text-gray-400 font-medium">
          <div className="flex items-center gap-2 px-4 py-2.5 border-r border-brand-border">
            <Clock className="w-3.5 h-3.5 text-brand-glow" />
            <span>Time: <strong className="text-gray-200">{result.execution_time_ms ?? '--'} ms</strong></span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5">
            <Cpu className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Memory: <strong className="text-gray-200">{result.memory_usage_kb ? (result.memory_usage_kb / 1024).toFixed(2) : '--'} MB</strong></span>
          </div>
        </div>
      )}

      {/* Console Screen */}
      <div ref={scrollRef} className="flex-1 bg-black/95 p-4 font-mono text-sm overflow-auto min-h-[150px]">
        {phase === 'compiling' && !output ? (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-glow/30 border-t-brand-glow animate-spin"></div>
            <span className="text-xs font-sans">Compiling…</span>
          </div>
        ) : !hasAnything ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 font-sans">
            <Terminal className="w-10 h-10 mb-2 opacity-30 text-gray-400" />
            <p className="text-xs">Run your code — type input below when the program asks for it</p>
          </div>
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed select-text break-words">
            {/* Streamed program output */}
            <span className="text-gray-200">{output}</span>

            {/* Trailing error block, if the run ended badly */}
            {isErrorStatus && result.error && (
              <span className={`${errorColor} block mt-2`}>
                <AlertTriangle className="w-4 h-4 inline mr-1.5 mb-1" />
                <strong>{errorLabel}</strong>{'\n'}
                {result.error}
              </span>
            )}

            {/* Success with no output at all */}
            {result?.status === 'Success' && !output && (
              <span className="text-gray-600 italic">Program executed successfully with empty output.</span>
            )}
          </div>
        )}
      </div>

      {/* Interactive stdin line — visible while the program is running */}
      {canInput && (
        <div className="flex items-center gap-2 px-3 py-2 bg-black border-t border-brand-glow/20">
          <span className="text-brand-emerald font-mono text-sm select-none">❯</span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type input and press Enter…"
            className="flex-1 bg-transparent text-gray-100 font-mono text-sm focus:outline-none placeholder:text-gray-600"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            onClick={submitInput}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-glow transition-colors select-none"
            title="Send input (Enter)"
          >
            <CornerDownLeft className="w-3.5 h-3.5" /> Send
          </button>
        </div>
      )}
    </div>
  );
};

export default OutputPanel;

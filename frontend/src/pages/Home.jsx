import React, { useState, useRef, useEffect, useCallback } from 'react';
import EditorPanel, { BOILERPLATE } from '../components/EditorPanel';
import OutputPanel from '../components/OutputPanel';
import ReportPanel from '../components/ReportPanel';

const WS_URL = 'ws://localhost:8000/api/ws/execute';

const Home = () => {
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(BOILERPLATE.cpp);
  const [stdin, setStdin] = useState('');

  // Live execution state
  const [output, setOutput] = useState('');       // streamed terminal text
  const [result, setResult] = useState(null);     // final status + metrics
  const [report, setReport] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState(null);        // 'compiling' | 'running' | 'reviewing'

  const wsRef = useRef(null);
  const token = localStorage.getItem('token');

  // Close the socket if the component unmounts mid-run.
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (_) {}
      }
    };
  }, []);

  const handleRunCode = useCallback(() => {
    // Tear down any previous run.
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (_) {}
      wsRef.current = null;
    }

    setOutput('');
    setResult(null);
    setReport(null);
    setIsRunning(true);
    setPhase('compiling');

    let ws;
    try {
      ws = new WebSocket(WS_URL);
    } catch (err) {
      setResult({ status: 'Runtime Error', error: 'Could not reach the execution server.', execution_time_ms: 0, memory_usage_kb: 0 });
      setIsRunning(false);
      setPhase(null);
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'start', token, code, language, stdin }));
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch (_) { return; }

      switch (msg.type) {
        case 'status':
          setPhase(msg.phase);
          break;
        case 'stdout':
          setOutput((prev) => prev + msg.data);
          break;
        case 'compile_error':
          setResult({ status: 'Compile Error', error: msg.data, execution_time_ms: 0, memory_usage_kb: 0 });
          break;
        case 'exit':
          setResult({
            status: msg.status,
            error: msg.error || '',
            execution_time_ms: msg.execution_time_ms,
            memory_usage_kb: msg.memory_usage_kb,
          });
          // Compile errors have no review; stop here.
          if (msg.status === 'Compile Error') {
            setIsRunning(false);
            setPhase(null);
          }
          break;
        case 'report':
          setReport(msg.data);
          break;
        case 'done':
          setIsRunning(false);
          setPhase(null);
          try { ws.close(); } catch (_) {}
          break;
        case 'error':
          setResult((prev) => ({
            status: prev?.status && prev.status !== 'Idle' ? prev.status : 'Runtime Error',
            error: msg.data,
            execution_time_ms: prev?.execution_time_ms || 0,
            memory_usage_kb: prev?.memory_usage_kb || 0,
          }));
          setIsRunning(false);
          setPhase(null);
          try { ws.close(); } catch (_) {}
          break;
        default:
          break;
      }
    };

    ws.onerror = () => {
      setResult((prev) => prev || { status: 'Runtime Error', error: 'Connection to the execution server failed.', execution_time_ms: 0, memory_usage_kb: 0 });
    };

    ws.onclose = () => {
      // If the socket dropped before we finished, make sure the UI is not stuck "running".
      setIsRunning(false);
      setPhase((p) => (p === 'reviewing' ? null : p));
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [token, code, language, stdin]);

  // Send a line of interactive input to the running process (and echo it locally).
  const handleSendInput = useCallback((text) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'stdin', data: text + '\n' }));
    setOutput((prev) => prev + text + '\n'); // local echo (pipes don't echo like a TTY)
  }, []);

  const handleStop = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'kill' }));
    }
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        {/* Left Side: Monaco Code Editor */}
        <div className="lg:col-span-6 xl:col-span-7">
          <EditorPanel
            language={language}
            setLanguage={setLanguage}
            code={code}
            setCode={setCode}
            stdin={stdin}
            setStdin={setStdin}
            isRunning={isRunning}
            onRun={handleRunCode}
          />
        </div>

        {/* Right Side: Split Terminal Console and AI Review */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col gap-6 h-[calc(100vh-140px)]">
          {/* Top: Interactive terminal console */}
          <div className="flex-[35] min-h-0">
            <OutputPanel
              output={output}
              result={result}
              isRunning={isRunning}
              phase={phase}
              onSendInput={handleSendInput}
              onStop={handleStop}
            />
          </div>

          {/* Bottom: AI Review panel */}
          <div className="flex-[65] min-h-0">
            <ReportPanel report={report} isRunning={isRunning} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;

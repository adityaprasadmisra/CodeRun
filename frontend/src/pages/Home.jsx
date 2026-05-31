import React, { useState } from 'react';
import axios from 'axios';
import EditorPanel, { BOILERPLATE } from '../components/EditorPanel';
import OutputPanel from '../components/OutputPanel';
import ReportPanel from '../components/ReportPanel';

const Home = () => {
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(BOILERPLATE.cpp);
  const [stdin, setStdin] = useState('');
  
  // Execution Results
  const [result, setResult] = useState(null);
  const [report, setReport] = useState(null);
  
  // Load States
  const [isRunning, setIsRunning] = useState(false);
  const token = localStorage.getItem('token');

  const handleRunCode = async () => {
    setIsRunning(true);
    setResult(null);
    setReport(null);

    try {
      const response = await axios.post(
        'http://localhost:8000/api/submissions',
        {
          code,
          language,
          stdin
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const submission = response.data;
      
      // Update result panel
      setResult({
        status: submission.status,
        output: submission.output,
        error: submission.error,
        execution_time_ms: submission.execution_time_ms,
        memory_usage_kb: submission.memory_usage_kb
      });

      // Update report panel if available (i.e. compiled successfully)
      if (submission.report) {
        setReport(submission.report);
      }
    } catch (err) {
      console.error(err);
      setResult({
        status: 'Runtime Error',
        output: '',
        error: err.response?.data?.detail || 'An error occurred during execution. Make sure backend is running.',
        execution_time_ms: 0,
        memory_usage_kb: 0
      });
    } finally {
      setIsRunning(false);
    }
  };

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
          {/* Top 35%: Terminal console output */}
          <div className="flex-[35] min-h-0">
            <OutputPanel result={result} isRunning={isRunning} />
          </div>

          {/* Bottom 65%: AI Review panel */}
          <div className="flex-[65] min-h-0">
            <ReportPanel report={report} isRunning={isRunning} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;

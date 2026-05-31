import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Code, ChevronDown, Keyboard } from 'lucide-react';

const BOILERPLATE = {
  c: `#include <stdio.h>\n\nint main() {\n    printf("Hello, CodeRun AI!\\n");\n    return 0;\n}`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, CodeRun AI!" << endl;\n    return 0;\n}`,
  python: `print("Hello, CodeRun AI!")`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, CodeRun AI!");\n    }\n}`
};

const EditorPanel = ({ language, setLanguage, code, setCode, stdin, setStdin, isRunning, onRun }) => {
  const [showStdin, setShowStdin] = useState(false);

  const handleLanguageChange = (e) => {
    const selected = e.target.value;
    setLanguage(selected);
    // Auto-update boilerplate if the editor has default code
    if (!code || Object.values(BOILERPLATE).includes(code)) {
      setCode(BOILERPLATE[selected]);
    }
  };

  const handleEditorChange = (value) => {
    setCode(value || '');
  };

  return (
    <div className="glass-panel overflow-hidden flex flex-col h-[calc(100vh-140px)]">
      {/* Editor Header / Tool Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-brand-border select-none">
        <div className="flex items-center gap-4">
          {/* Custom Language Dropdown */}
          <div className="relative flex items-center">
            <Code className="absolute left-3 w-4 h-4 text-brand-glow" />
            <select
              value={language}
              onChange={handleLanguageChange}
              className="bg-gray-900 border border-brand-border text-gray-200 pl-9 pr-8 py-1.5 rounded-lg text-sm appearance-none focus:outline-none focus:border-brand-glow/50 transition-all font-medium cursor-pointer"
            >
              <option value="cpp">C++ (GCC 12)</option>
              <option value="c">C (GCC 12)</option>
              <option value="python">Python (3.11)</option>
              <option value="java">Java (OpenJDK 17)</option>
            </select>
            <ChevronDown className="absolute right-3 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Stdin Toggle Button */}
          <button
            onClick={() => setShowStdin(!showStdin)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 border ${
              showStdin 
                ? 'bg-brand-glow/10 border-brand-glow/40 text-brand-glow' 
                : 'bg-white/5 border-transparent text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Custom Input
          </button>
        </div>

        {/* Action Run Button */}
        <button
          onClick={onRun}
          disabled={isRunning}
          className={`glass-btn-success text-sm py-1.5 px-5 font-semibold ${
            isRunning ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running...' : 'Run Code'}
        </button>
      </div>

      {/* Editor & Stdin Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language === 'java' ? 'java' : 'python'}
            value={code}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'Fira Code', 'Courier New', monospace",
              fontLigatures: true,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              padding: { top: 12, bottom: 12 },
              lineNumbers: 'on',
              roundedSelection: true,
            }}
          />
        </div>

        {/* Stdin Sliding Panel */}
        {showStdin && (
          <div className="h-1/3 min-h-[120px] bg-gray-950 border-t border-brand-border flex flex-col p-4 transition-all duration-300">
            <div className="flex items-center justify-between mb-2 select-none">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Custom Standard Input (stdin)</span>
              <button 
                onClick={() => setShowStdin(false)}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Hide
              </button>
            </div>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Provide test inputs here..."
              className="flex-1 bg-black/40 border border-brand-border rounded-lg p-2.5 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-brand-glow/40"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorPanel;
export { BOILERPLATE };

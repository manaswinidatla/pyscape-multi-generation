import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { keymap } from '@codemirror/view';
import { Moon, Sun, Copy, Share2, Download, Settings, Code2, Play, CheckCircle, Terminal, Trash2 } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

// LANGUAGE CONFIGURATION
const languageConfig = {
  javascript: {
    id: 93,
    extension: javascript({ jsx: true }),
    defaultCode: `// Welcome to the JavaScript Playground!\n// Code here runs directly in your browser.\n\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet('PyScape'));`,
    executionModel: 'client',
  },
  python: {
    id: 71,
    extension: python(),
    defaultCode: `# Welcome to the Python Playground!\n# This code runs on a secure server.\n\ndef greet(name):\n    return f"Hello, {name}!"\n\n# You can use input() for user interaction\nname = input("Enter your name: ")\nprint(greet(name))`,
    executionModel: 'server',
  },
  java: {
    id: 62,
    extension: java(),
    defaultCode: `// Welcome to the Java Playground!\n// This code is compiled and run on a secure server.\n\nimport java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        System.out.print("Enter your name: ");\n        String name = scanner.nextLine();\n        System.out.println("Hello, " + name + "!");\n        scanner.close();\n    }\n}`,
    executionModel: 'server',
  },
  cpp: {
    id: 54,
    extension: cpp(),
    defaultCode: `// Welcome to the C++ Playground!\n// This code is compiled and run on a secure server.\n\n#include <iostream>\n#include <string>\n\nint main() {\n    std::string name;\n    std::cout << "Enter your name: ";\n    std::getline(std::cin, name);\n    std::cout << "Hello, " << name << "!" << std::endl;\n    return 0;\n}`,
    executionModel: 'server',
  },
  c: {
    id: 50,
    extension: cpp(),
    defaultCode: `// Welcome to the C Playground!\n// This code is compiled and run on a secure server.\n\n#include <stdio.h>\n\nint main() {\n    char name[50];\n    printf("Enter your name: ");\n    fgets(name, sizeof(name), stdin);\n    printf("Hello, %s", name);\n    return 0;\n}`,
    executionModel: 'server',
  },
};

// HELPER FUNCTION FOR JAVASCRIPT SANDBOX
function createSandboxHtml(isDark) {
  const styles = isDark
    ? `
      html, body {
        margin: 0;
        padding: 16px;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        color: #e2e8f0;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
        font-size: 14px;
        line-height: 1.6;
      }
      #output {
        background: rgba(15, 23, 42, 0.6);
        border-radius: 8px;
        padding: 16px;
        border: 1px solid #334155;
        min-height: 350px;
      }
      .log-line {
        margin: 6px 0;
        padding: 4px 0;
        border-bottom: 1px solid rgba(51, 65, 85, 0.3);
      }
      .error-line {
        color: #f87171 !important;
        background: rgba(248, 113, 113, 0.1);
        padding: 8px 12px;
        border-radius: 6px;
        border-left: 3px solid #f87171;
        margin: 8px 0;
      }
    `
    : `
      html, body {
        margin: 0;
        padding: 16px;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        color: #334155;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
        font-size: 14px;
        line-height: 1.6;
      }
      #output {
        background: rgba(255, 255, 255, 0.9);
        border-radius: 8px;
        padding: 16px;
        border: 1px solid #cbd5e1;
        backdrop-filter: blur(10px);
        min-height: 350px;
      }
      .log-line {
        margin: 6px 0;
        padding: 4px 0;
        border-bottom: 1px solid rgba(203, 213, 225, 0.4);
      }
      .error-line {
        color: #dc2626 !important;
        background: rgba(220, 38, 38, 0.1);
        padding: 8px 12px;
        border-radius: 6px;
        border-left: 3px solid #dc2626;
        margin: 8px 0;
      }
    `;

  return `<!doctype html><html><head><meta charset="utf-8"><style>${styles}</style></head><body><div id="output"></div><script>
(function(){
  const outputEl = document.getElementById('output');
  let logCount = 0;
  
  const write = (msg, type='log') => {
    const line = document.createElement('div');
    line.className = type === 'error' ? 'error-line' : 'log-line';
    line.innerHTML = '<small style="opacity: 0.6;">[' + (++logCount) + ']</small> ' + msg;
    outputEl.appendChild(line);
    outputEl.scrollTop = outputEl.scrollHeight;
  };
  
  const log = (...args) => {
    const formattedArgs = args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
      catch(e) { return String(a); }
    });
    write(formattedArgs.join(' '));
  };
  
  console.log = log; 
  console.error = (...args) => write(String(...args), 'error'); 
  console.warn = log;
  
  window.addEventListener('message', (ev) => {
    if (ev.data.type === "clear-console") {
      outputEl.innerHTML = '<div class="log-line">🧹 Console cleared</div>';
      logCount = 0;
      return;
    }
    if(!ev || !ev.data || ev.data.type !== 'run-code') return;
    outputEl.innerHTML = '<div class="log-line"><strong>🚀 Executing JavaScript...</strong></div>';
    logCount = 1;
    try {
      const fn = new Function(ev.data.code);
      const result = fn();
      if(result !== undefined){ log('Return value:', result); }
      write('✅ Execution completed successfully!', 'log');
    } catch(err) {
      write('❌ ' + String(err), 'error');
    }
  });
  
  write('🎉 JavaScript Console Ready! Run your code to see output.', 'log');
})();
</script></body></html>`;
}

// Main Component
const UniversalCodePlayground = ({ 
  defaultLanguage = 'javascript',
  initialCode = null,
  height = '400px',
  className = '',
  showThemeToggle = true,
  testCases = []
}) => {
  const [isDark, setIsDark] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(defaultLanguage);
  const [code, setCode] = useState(
    initialCode != null ? initialCode : languageConfig[defaultLanguage].defaultCode
  );
  const [output, setOutput] = useState('');
  const [stdin, setStdin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [showTestPanel, setShowTestPanel] = useState(true);

  const config = languageConfig[currentLanguage];

  // Reset code when language changes
  useEffect(() => {
    setCode(languageConfig[currentLanguage].defaultCode);
    setOutput('');
    setStdin('');
    setTestResults([]);
  }, [currentLanguage]);

  // Update code when initialCode prop changes (e.g., user clicks a different example)
  useEffect(() => {
    if (initialCode != null) {
      setCode(initialCode);
      setOutput('');
      setStdin('');
      setTestResults([]);
    }
  }, [initialCode]);

  // Run test cases comparison after output changes
  useEffect(() => {
    if (testCases.length > 0 && output && !isLoading) {
      const results = testCases.map((tc, idx) => ({
        id: idx + 1,
        description: tc.description,
        check: tc.check,
        passed: !tc.check
          ? !output.toLowerCase().includes('error')
          : output.includes(tc.check)
      }));
      setTestResults(results);
    }
  }, [output, isLoading, testCases]);

  const iframeRef = useRef(null);
  const sandboxUrl = useMemo(() => {
    if (config.executionModel !== 'client') return null;
    const html = createSandboxHtml(isDark);
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [config.executionModel, isDark]);

  const runCode = useCallback(async () => {
    if (config.executionModel === 'client') {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) return;
      iframe.src = sandboxUrl;
      const send = () => iframe.contentWindow.postMessage({ type: 'run-code', code }, '*');
      setTimeout(send, 50);
      return;
    }
    
    setIsLoading(true);
    setOutput('🚀 Executing code on server...\n\n');
    
    // Use environment variable for RapidAPI key
    const API_KEY = process.env.REACT_APP_RAPIDAPI_KEY || 'YOUR_RAPIDAPI_KEY_HERE';
    
    if (!API_KEY || API_KEY === 'YOUR_RAPIDAPI_KEY_HERE') {
      setOutput('❌ Error: RapidAPI key not configured. Please add REACT_APP_RAPIDAPI_KEY to your .env file.');
      setIsLoading(false);
      return;
    }

    const options = {
      method: 'POST',
      url: 'https://judge0-ce.p.rapidapi.com/submissions',
      params: { base64_encoded: 'false', fields: '*' },
      headers: { 
        'content-type': 'application/json', 
        'X-RapidAPI-Key': API_KEY, 
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com' 
      },
      data: { 
        language_id: config.id, 
        source_code: code,
        stdin: stdin 
      },
    };
    
    try {
      const submissionResponse = await axios.request(options);
      const token = submissionResponse.data.token;
      
      // Poll for result
      setTimeout(async () => {
        try {
          const resultResponse = await axios.get(
            `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=false`,
            { headers: { 'X-RapidAPI-Key': API_KEY, 'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com' } }
          );
          const result = resultResponse.data;
          
          if (result.stdout) {
            setOutput(`✅ Output:\n${result.stdout}`);
          } else if (result.stderr) {
            setOutput(`❌ Runtime Error:\n${result.stderr}`);
          } else if (result.compile_output) {
            setOutput(`⚠️ Compilation Error:\n${result.compile_output}`);
          } else {
            setOutput('✅ Execution finished with no output.');
          }
        } catch (err) { 
          setOutput(`❌ Error fetching result: ${err.message}`); 
        } finally { 
          setIsLoading(false); 
        }
      }, 3000);
    } catch (error) {
      setOutput(`❌ API request error: ${error.response?.data?.message || error.message}`);
      setIsLoading(false);
    }
  }, [config.executionModel, config.id, sandboxUrl, code, stdin]);

  const clearConsole = useCallback(() => {
    if (config.executionModel === 'client' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'clear-console' }, '*');
    } else {
      setOutput('');
    }
  }, [config.executionModel]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  };

  const shareCode = async () => {
    const shareData = {
      title: `${currentLanguage.toUpperCase()} Code - PyScape`,
      text: `Check out this ${currentLanguage} code from PyScape!`,
      url: window.location.href
    };
    
    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success("Code shared successfully!");
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n\n${code}`);
        setShared(true);
        toast.success("Code copied for sharing!");
        setTimeout(() => setShared(false), 2000);
      }
    } catch (err) {
      toast.error("Failed to share code");
    }
  };

  const downloadCode = () => {
    const extensions = { javascript: 'js', python: 'py', java: 'java', cpp: 'cpp', c: 'c' };
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pyscape-code.${extensions[currentLanguage]}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Code downloaded!");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
          e.preventDefault();
          runCode();
        } else if (e.key === 'i') {
          e.preventDefault();
          clearConsole();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runCode, clearConsole]);

  const ctrlEnterKeymap = keymap.of([
    {
      key: 'Ctrl-Enter',
      run: () => {
        runCode();
        return true;
      },
    },
    {
      key: 'Cmd-Enter',
      run: () => {
        runCode();
        return true;
      },
    },
  ]);

  // Theme-based styling
  const themeStyles = isDark ? {
    container: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50',
    header: 'bg-gradient-to-r from-slate-800/90 to-slate-700/90 border-slate-600/50',
    editor: 'bg-black/20 border-slate-600/30',
    text: 'text-slate-100',
    subtext: 'text-slate-300',
    button: 'bg-slate-700/80 text-slate-200 hover:bg-slate-600/80 border-slate-600/50',
    activeButton: 'bg-primary text-white shadow-lg shadow-primary/25 border-primary',
    runButton: 'bg-green-600 hover:bg-green-500 text-white',
    clearButton: 'bg-red-600 hover:bg-red-500 text-white',
    outputBg: 'bg-slate-900/90 border-slate-600/30 text-slate-100'
  } : {
    container: 'bg-gradient-to-br from-slate-50 via-white to-slate-100 border-slate-200',
    header: 'bg-white/90 border-slate-200',
    editor: 'bg-white/50 border-slate-200',
    text: 'text-slate-800',
    subtext: 'text-slate-600',
    button: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300',
    activeButton: 'bg-primary text-white shadow-lg shadow-primary/25 border-primary',
    runButton: 'bg-green-600 hover:bg-green-500 text-white',
    clearButton: 'bg-red-600 hover:bg-red-500 text-white',
    outputBg: 'bg-white/90 border-slate-200 text-slate-800'
  };

  return (
    <div className={`${themeStyles.container} overflow-hidden border shadow-2xl transition-all duration-500 rounded-lg ${className}`}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={isDark ? "dark" : "light"}
      />
      
      {/* Header */}
      <div className={`${themeStyles.header} p-4 flex flex-wrap items-center justify-between gap-4 border-b backdrop-blur-sm`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" />
            <span className={`${themeStyles.text} font-bold text-lg`}>PyScape Sandbox</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
          </div>
        </div>
     
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            <span className={`${themeStyles.subtext} text-sm font-medium`}>Language</span>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {Object.keys(languageConfig).map((lang) => (
              <button
                key={lang}
                onClick={() => setCurrentLanguage(lang)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md border transition-all duration-300 transform hover:scale-105 ${
                  currentLanguage === lang ? themeStyles.activeButton : themeStyles.button
                }`}
              >
                {lang.charAt(0).toUpperCase() + lang.slice(1).replace('pp', '++')}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={copyCode}
              className={`${themeStyles.button} p-2 rounded-md border transition-all duration-300 hover:scale-105`}
              title="Copy code"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            
            <button
              onClick={shareCode}
              className={`${themeStyles.button} p-2 rounded-md border transition-all duration-300 hover:scale-105`}
              title="Share code"
            >
              {shared ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
            </button>
            
            <button
              onClick={downloadCode}
              className={`${themeStyles.button} p-2 rounded-md border transition-all duration-300 hover:scale-105`}
              title="Download code"
            >
              <Download className="w-4 h-4" />
            </button>
            
            {showThemeToggle && (
              <button
                onClick={() => setIsDark(!isDark)}
                className={`${themeStyles.button} p-2 rounded-md border transition-all duration-300 hover:scale-105`}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Editor Panel */}
        <div className={`${themeStyles.editor} p-4 border-r border-slate-600/30 lg:border-r`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`${themeStyles.text} text-lg font-bold flex items-center gap-2`}>
              <Terminal className="w-4 h-4 text-primary" />
              {currentLanguage.replace('pp', '++')} Editor
              <span className={`text-xs ${themeStyles.subtext} bg-slate-500/20 px-2 py-1 rounded-full`}>
                {config.executionModel === 'client' ? 'Browser' : 'Server'}
              </span>
            </h3>
            <div className="flex gap-2">
              <button
                onClick={runCode}
                disabled={isLoading}
                className={`${themeStyles.runButton} px-3 py-1.5 rounded-md font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg`}
                title="Run code (Ctrl+Enter)"
              >
                <Play className="w-3 h-3" />
                {isLoading ? 'Running...' : 'Run'}
              </button>
              <button
                onClick={clearConsole}
                className={`${themeStyles.clearButton} px-3 py-1.5 rounded-md font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 shadow-lg`}
                title="Clear console (Ctrl+I)"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>
          
          <div className="rounded-md overflow-hidden border border-slate-600/30 shadow-lg">
            <CodeMirror
              className="cursor-text"
              value={code}
              height={height}
              theme={isDark ? oneDark : undefined}
              extensions={[config.extension, ctrlEnterKeymap]}
              basicSetup={{ 
                lineNumbers: true,
                foldGutter: true,
                highlightSelectionMatches: true,
                searchKeymap: true
              }}
              onChange={(val) => setCode(val)}
            />
          </div>

          {/* Input Section for Server Languages */}
          {config.executionModel === 'server' && (
            <div className="mt-4">
              <h4 className={`${themeStyles.text} text-sm font-semibold mb-2 flex items-center gap-2`}>
                <Terminal className="w-3 h-3" />
                Input (stdin)
              </h4>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Enter input here, each line for each input() call..."
                className={`w-full h-20 p-3 rounded-md border ${themeStyles.outputBg} text-sm font-mono resize-none`}
              />
            </div>
          )}
        </div>

        {/* Output Panel */}
        <div className={`${themeStyles.editor} p-4`}>
          <h3 className={`${themeStyles.text} text-lg font-bold mb-4 flex items-center gap-2`}>
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
            Output
            <span className={`text-xs ${themeStyles.subtext} bg-slate-500/20 px-2 py-1 rounded-full`}>
              {config.executionModel === 'client' ? 'Live' : 'Remote'}
            </span>
          </h3>
          
          <div className="rounded-md overflow-hidden border border-slate-600/30 shadow-lg">
            {config.executionModel === 'client' ? (
              <iframe
                ref={iframeRef}
                title="playground-sandbox"
                className="w-full rounded-md bg-transparent"
                style={{ height: stdin ? `calc(${height} + 80px)` : height }}
                sandbox="allow-scripts"
                src={sandboxUrl}
              />
            ) : (
              <pre 
                className={`w-full p-4 ${themeStyles.outputBg} text-sm whitespace-pre-wrap overflow-auto font-mono leading-relaxed rounded-md`}
                style={{ height: stdin ? `calc(${height} + 80px)` : height }}
              >
                {output || `💡 Click "Run Code" to execute your ${currentLanguage} code...\n\n🚀 Your code will be processed on our secure servers\n📊 Results will appear here in real-time\n\n⌨️ Shortcuts:\n• Ctrl+Enter: Run code\n• Ctrl+I: Clear console`}
              </pre>
            )}
          </div>
        </div>
      </div>
      
      {/* Test Cases Panel */}
      {testCases.length > 0 && (
        <div className={`border-t border-slate-600/30`}>
          <button
            onClick={() => setShowTestPanel(p => !p)}
            className={`w-full px-4 py-2 flex items-center justify-between ${themeStyles.header} hover:opacity-90 transition-opacity`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className={themeStyles.text}>Test Cases</span>
              {testResults.length > 0 && (
                <span className="ml-2 text-xs">
                  <span className="text-green-400">{testResults.filter(r => r.passed).length} passed</span>
                  {testResults.some(r => !r.passed) && (
                    <span className="text-red-400 ml-1">{testResults.filter(r => !r.passed).length} failed</span>
                  )}
                </span>
              )}
            </div>
            <svg
              className={`w-4 h-4 ${themeStyles.subtext} transition-transform duration-200 ${showTestPanel ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showTestPanel && (
            <div className={`px-4 py-3 space-y-2`}>
              {testResults.length === 0 ? (
                <p className={`text-xs ${themeStyles.subtext} italic`}>
                  ▶ Run your code to check the test cases below.
                </p>
              ) : null}
              {testCases.map((tc, idx) => {
                const result = testResults[idx];
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                      !result
                        ? `${themeStyles.editor} border-slate-600/30 opacity-60`
                        : result.passed
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <span className="mt-0.5 text-base leading-none">
                      {!result ? '⬜' : result.passed ? '✅' : '❌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${themeStyles.text}`}>
                        Test {idx + 1}: {tc.description}
                      </p>
                      {tc.check && (
                        <p className={`mt-1 text-xs font-mono truncate ${themeStyles.subtext}`}>
                          Expected output to contain: <span className="text-primary">"{tc.check}"</span>
                        </p>
                      )}
                      {result && !result.passed && tc.check && (
                        <p className="mt-1 text-xs text-red-400">
                          Not found in output. Run the code above and verify.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {testResults.length > 0 && (
                <p className={`text-xs ${themeStyles.subtext} pt-1`}>
                  💡 Edit the code above and click <strong>Run</strong> again to re-check.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status Bar */}
      <div className={`${themeStyles.header} px-4 py-2 border-t border-slate-600/30 backdrop-blur-sm`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className={themeStyles.subtext}>
              Runtime: {config.executionModel === 'client' ? '🌐 Browser (V8)' : '🖥️ Judge0 CE'}
            </span>
            <span className={themeStyles.subtext}>
              Language ID: {config.id}
            </span>
          </div>
          <div className={`${themeStyles.subtext} flex items-center gap-2`}>
            <span>PyScape Sandbox Ready</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversalCodePlayground;
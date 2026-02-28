import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import MonacoEditor from '@monaco-editor/react';
import supabase from '../utils/supabaseClient';
import axios from 'axios';

// Language ID mapping for Judge0
const LANGUAGE_IDS = {
  python: 71,
  javascript: 93,
  java: 62,
  cpp: 54,
  c: 50
};

const CodeDuel = () => {
  const { user } = useAuth();
  
  const [ws, setWs] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [gameState, setGameState] = useState('MENU');
  const [queuePosition, setQueuePosition] = useState(null);
  const [duel, setDuel] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [code, setCode] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [results, setResults] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [stdin, setStdin] = useState('');
  const [hasCompleted, setHasCompleted] = useState(false);
  const [opponentCompleted, setOpponentCompleted] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [lastTestResults, setLastTestResults] = useState(null); // For future replay feature
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const lastRequestTime = useRef(0);
  const chatEndRef = useRef(null);

  const addNotification = useCallback((text) => {
    setChatMessages(prev => [...prev, { type: 'system', text, timestamp: Date.now() }]);
  }, []);

  const addChatMessage = useCallback((message) => {
    setChatMessages(prev => [...prev, {
      type: 'chat',
      userId: message.userId,
      nickname: message.nickname,
      text: message.message,
      timestamp: message.timestamp
    }]);
    // Auto-scroll to bottom
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const handleDuelStart = useCallback((message) => {
    setDuel({
      id: message.duelId,
      problem: message.problem,
      timeLimit: message.timeLimit
    });
    setOpponent(message.opponent);
    setCode(message.problem.starterCode || '');
    setGameState('DUEL');
    setTimeRemaining(message.timeLimit);
    setChatMessages([]);
    setSubmissions([]);
    setHasCompleted(false);
    setOpponentCompleted(false);
    setOutput('');
    setLastTestResults(null);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, message.timeLimit - elapsed);
      setTimeRemaining(remaining);
      if (remaining === 0) clearInterval(timerRef.current);
    }, 1000);
  }, []);

  const updateDuelState = useCallback((message) => {
    setTimeRemaining(message.timeRemaining);
  }, []);

  const handleSubmissionResult = useCallback((result) => {
    setIsSubmitting(false);
    setSubmissions(prev => [...prev, result]);
    if (result.passed) {
      addNotification('All tests passed! Waiting for opponent...');
    } else {
      addNotification(`${result.status} - Check your code and try again`);
    }
  }, [addNotification]);

  const handleDuelEnd = useCallback((message) => {
    console.log('🏁 DUEL_END received, transitioning to results:', message);
    clearInterval(timerRef.current);
    setResults(message.results);
    setGameState('RESULTS');
    console.log('✅ State changed to RESULTS');
  }, []);

  const handleDuelForfeited = useCallback((message) => {
    clearInterval(timerRef.current);
    if (message.forfeitedBy === user?.id) {
      alert('You forfeited the duel');
    } else {
      alert('Opponent forfeited. You win!');
    }
    setGameState('MENU');
  }, [user]);

  const handleWebSocketMessage = useCallback((message) => {
    console.log('Received:', message);

    switch (message.type) {
      case 'AUTH_SUCCESS':
        console.log('Authenticated successfully');
        setWsConnected(true);
        break;
      case 'QUEUE_JOINED':
        setQueuePosition(message.position);
        setGameState('QUEUE');
        break;
      case 'QUEUE_LEFT':
        setGameState('MENU');
        setQueuePosition(null);
        break;
      case 'DUEL_START':
        handleDuelStart(message);
        break;
      case 'DUEL_STATE':
        updateDuelState(message);
        break;
      case 'SUBMISSION_RESULT':
        handleSubmissionResult(message.result);
        break;
      case 'OPPONENT_COMPLETED':
        console.log('Opponent completed:', message);
        setOpponentCompleted(true);
        addNotification(`${message.nickname} completed the problem!`);
        break;
      case 'DUEL_END':
        console.log('Duel ended:', message);
        handleDuelEnd(message);
        break;
      case 'DUEL_FORFEITED':
        handleDuelForfeited(message);
        break;
      case 'OPPONENT_DISCONNECTED':
        console.log('Opponent disconnected:', message);
        addNotification('⚠️ Opponent disconnected, waiting for reconnection...', 'warning');
        break;
      case 'OPPONENT_RECONNECTED':
        console.log('Opponent reconnected:', message);
        addNotification('✅ Opponent reconnected', 'success');
        break;
      case 'CHAT_MESSAGE':
        addChatMessage(message);
        break;
      case 'ERROR':
        alert(message.message);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }, [handleDuelStart, updateDuelState, handleSubmissionResult, handleDuelEnd, handleDuelForfeited, addNotification, addChatMessage]);

  useEffect(() => {
    if (!user) return;

    const connectWebSocket = async () => {
      // Get the current session token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No active session found');
        setWsConnected(false);
        return;
      }

      console.log('Session found, user ID:', session.user.id);
      console.log('Token length:', session.access_token.length);

      const websocket = new WebSocket('ws://localhost:8080');
      wsRef.current = websocket;

      websocket.onopen = () => {
        console.log('✅ WebSocket connection opened');
        console.log('📤 Sending AUTHENTICATE message...');
        websocket.send(JSON.stringify({
          type: 'AUTHENTICATE',
          token: session.access_token
        }));
      };

      websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        handleWebSocketMessage(message);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      websocket.onclose = () => {
        console.log('Disconnected from duel server');
        setWsConnected(false);
      };

      setWs(websocket);
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user, handleWebSocketMessage]);

  const joinQueue = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert('Not connected to server. Please make sure the backend is running (npm run dev:duel in backend folder)');
      return;
    }
    ws.send(JSON.stringify({
      type: 'JOIN_QUEUE',
      difficulty: selectedDifficulty,
      language: selectedLanguage
    }));
  };

  const leaveQueue = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'LEAVE_QUEUE' }));
    }
  };

  // Helper function to add delay between API requests (rate limiting)
  const waitForRateLimit = async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    const minDelay = 8000; // 8 seconds between requests (very aggressive for free tier)
    
    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest;
      setOutput(prev => prev + `\n⏳ Rate limiting: waiting ${(waitTime/1000).toFixed(1)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastRequestTime.current = Date.now();
  };

  // Shared function to execute code against test cases
  const executeCode = async (isSubmission = false) => {
    if (!code.trim()) return null;
    
    if (!duel || !duel.id) {
      addNotification('❌ Error: No active duel found');
      return null;
    }
    
    setOutput('🚀 Executing code...\n⏱️ Note: Tests run with 8-second delays to avoid rate limits\n\n');
    
    // Use environment variable for RapidAPI key
    const API_KEY = process.env.REACT_APP_RAPIDAPI_KEY || 'YOUR_RAPIDAPI_KEY_HERE';
    
    if (!API_KEY || API_KEY === 'YOUR_RAPIDAPI_KEY_HERE') {
      setOutput('❌ Error: RapidAPI key not configured. Please add REACT_APP_RAPIDAPI_KEY to your .env file.');
      setIsSubmitting(false);
      return;
    }

    // Get language ID for Judge0
    const languageId = LANGUAGE_IDS[selectedLanguage];
    
    try {
      // Combine public and hidden test cases with multiple fallback properties
      const publicTests = duel.problem.tests_public || duel.problem.testsPublic || duel.problem.publicTests || [];
      const hiddenTests = duel.problem.tests_hidden || duel.problem.testsHidden || duel.problem.hiddenTests || [];
      const allTestCases = [...publicTests, ...hiddenTests];
      
      // If no test cases available, create a basic test case for manual testing
      if (allTestCases.length === 0) {
        addNotification('⚠️ No test cases available. Running code with custom input.');
        
        // Run code with stdin input if provided
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
            language_id: languageId, 
            source_code: code,
            stdin: stdin || ''
          },
        };
        
        const submissionResponse = await axios.request(options);
        const token = submissionResponse.data.token;
        
        // Poll for result
        let attempts = 0;
        let result = null;
        
        while (attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const resultResponse = await axios.get(
            `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=false`,
            { headers: { 'X-RapidAPI-Key': API_KEY, 'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com' } }
          );
          
          result = resultResponse.data;
          
          if (result.status.id > 2) {
            break;
          }
          
          attempts++;
        }
        
        if (!result) {
          throw new Error('Execution timeout');
        }
        
        // Display output
        if (result.stdout) {
          setOutput(`✅ Code executed successfully!\n\nOutput:\n${result.stdout}\n\n⚠️ Note: This problem has no automated test cases. Please verify your solution manually.`);
        } else if (result.stderr) {
          setOutput(`❌ Runtime Error:\n${result.stderr}`);
        } else if (result.compile_output) {
          setOutput(`⚠️ Compilation Error:\n${result.compile_output}`);
        } else {
          setOutput('✅ Code executed with no output.');
        }
        
        setIsSubmitting(false);
        return;
      }
      
      let passedTests = 0;
      let totalTests = allTestCases.length;
      const testResults = [];

      // Run code against each test case
      for (let i = 0; i < allTestCases.length; i++) {
        const testCase = allTestCases[i];
        const testInput = testCase.input || '';
        const expectedOutput = testCase.expected_output || testCase.expectedOutput || '';
        
        setOutput(prev => prev + `\nRunning test ${i + 1}/${allTestCases.length}...`);
        
        // For Python, JavaScript, and Java, we need to append the test call to the code
        let fullCode = code;
        
        // Append test execution based on language
        if (selectedLanguage === 'python') {
          // For Python, append the test input as executable code
          fullCode = code + '\n\n# Test execution\n' + testInput;
        } else if (selectedLanguage === 'javascript') {
          // For JavaScript, append the test input as executable code
          fullCode = code + '\n\n// Test execution\n' + testInput;
        } else if (selectedLanguage === 'java') {
          // For Java, the test input should be in stdin or we need to modify main
          // For now, append to main method
          fullCode = code + '\n// Test will use stdin';
        }
        
        // Wait for rate limit before making request
        await waitForRateLimit();
        
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
            language_id: languageId, 
            source_code: fullCode,
            stdin: '', // Empty stdin since we're appending test calls to code
            expected_output: expectedOutput
          },
        };
        
        let submissionResponse;
        let retryCount = 0;
        const maxRetries = 3; // Reduce retries - if hitting rate limit, better to skip test
        
        // Retry logic for rate limiting
        while (retryCount < maxRetries) {
          try {
            submissionResponse = await axios.request(options);
            break; // Success, exit retry loop
          } catch (error) {
            if (error.response && error.response.status === 429) {
              retryCount++;
              if (retryCount < maxRetries) {
                const backoffTime = 10000 * retryCount; // Very long backoff: 10s, 20s, 30s
                const retryMsg = `\n⚠️ Rate limit hit, waiting ${backoffTime/1000}s before retry ${retryCount}/${maxRetries}...`;
                setOutput(prev => prev + retryMsg);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
              } else {
                // Don't throw error, just mark test as failed and continue
                setOutput(prev => prev + `\n❌ Rate limit exceeded after ${maxRetries} retries. Skipping this test.`);
                break;
              }
            } else {
              throw error; // Re-throw non-429 errors
            }
          }
        }
        
        if (!submissionResponse) {
          // Rate limit exceeded - mark test as failed and continue
          testResults.push({
            testCase: i + 1,
            name: testCase.name || `Test ${i + 1}`,
            passed: false,
            input: testInput,
            expectedOutput: expectedOutput.trim(),
            actualOutput: '',
            error: 'Rate limit exceeded',
            status: 'Rate Limited',
            time: null
          });
          continue; // Continue to next test instead of stopping
        }
        
        const token = submissionResponse.data.token;
        
        // Poll for result with retry logic
        let attempts = 0;
        let result = null;
        
        while (attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const resultResponse = await axios.get(
            `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=false`,
            { headers: { 'X-RapidAPI-Key': API_KEY, 'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com' } }
          );
          
          result = resultResponse.data;
          
          // Check if processing is complete
          if (result.status.id > 2) {
            break;
          }
          
          attempts++;
        }
        
        if (!result) {
          throw new Error('Execution timeout');
        }
        
        // Check if test passed
        const actualOutput = result.stdout?.trim() || '';
        const expectedTrimmed = expectedOutput.trim();
        const passed = result.status.id === 3 && actualOutput === expectedTrimmed;
        
        if (passed) passedTests++;
        
        testResults.push({
          testCase: i + 1,
          name: testCase.name || `Test ${i + 1}`,
          passed,
          input: testInput,
          expectedOutput: expectedTrimmed,
          actualOutput: actualOutput,
          error: result.stderr || result.compile_output,
          status: result.status.description,
          time: result.time
        });
      }
      
      // Calculate score
      const score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
      const allPassed = passedTests === totalTests;
      
      // Create submission result
      const submissionResult = {
        timestamp: Date.now(),
        status: allPassed ? 'Accepted' : `${passedTests}/${totalTests} tests passed`,
        passed: allPassed,
        score: score,
        runtime: testResults[0]?.time || 0,
        testResults: testResults
      };
      
      // Add to submissions
      setSubmissions(prev => [...prev, submissionResult]);
      
      // Store test results
      const result = {
        passedTests,
        totalTests,
        score,
        allPassed,
        testResults
      };
      
      return result;
      
    } catch (error) {
      console.error('Code execution error:', error);
      setOutput(`❌ Execution error: ${error.message}`);
      return null;
    }
  };

  // Run code to see test results (no submission)
  const runCode = async () => {
    if (!code.trim() || isRunning || isSubmitting) return;
    
    setIsRunning(true);
    const result = await executeCode(false);
    setIsRunning(false);
    
    if (!result) return;
    
    const { passedTests, totalTests, score, allPassed, testResults } = result;
    setLastTestResults(result);
    
    if (allPassed) {
      setOutput(`✅ All ${totalTests} tests passed!\n\nScore: ${score}/100\n\n💡 Great! Now click "Submit Solution" to complete the duel.`);
    } else {
      let outputText = `❌ ${passedTests}/${totalTests} tests passed\n\nScore: ${score}/100\n\n`;
      outputText += 'Failed tests:\n';
      testResults.filter(t => !t.passed).forEach(t => {
        outputText += `\n${t.name}:\n`;
        outputText += `  Expected: ${t.expectedOutput}\n`;
        outputText += `  Got: ${t.actualOutput}\n`;
        if (t.error) outputText += `  Error: ${t.error}\n`;
      });
      setOutput(outputText);
    }
  };

  // Submit solution to complete the duel
  const submitCode = async () => {
    if (!code.trim() || isSubmitting || hasCompleted) return;
    
    setIsSubmitting(true);
    const result = await executeCode(true);
    setIsSubmitting(false);
    
    if (!result) return;
    
    const { passedTests, totalTests, score, allPassed, testResults } = result;
    
    // Create submission result
    const submissionResult = {
      timestamp: Date.now(),
      status: allPassed ? 'Accepted' : `${passedTests}/${totalTests} tests passed`,
      passed: allPassed,
      score: score,
      runtime: testResults[0]?.time || 0,
      testResults: testResults
    };
    
    // Add to submissions
    setSubmissions(prev => [...prev, submissionResult]);
    
    if (allPassed) {
      console.log('Submitting solution. Opponent completed:', opponentCompleted);
      setOutput(`✅ All ${totalTests} tests passed!\n\nScore: ${score}/100\n\n🎉 Solution submitted! ${opponentCompleted ? 'Calculating results...' : 'Waiting for opponent...'}`);
      addNotification('✅ Solution submitted successfully!');
      setHasCompleted(true);
      
      // Send completion to WebSocket server
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('Sending DUEL_COMPLETE to server');
        ws.send(JSON.stringify({
          type: 'DUEL_COMPLETE',
          duelId: duel.id,
          score: score,
          completedAt: Date.now()
        }));
      } else {
        console.error('WebSocket not connected!');
      }
    } else {
      let outputText = `❌ ${passedTests}/${totalTests} tests passed\n\nScore: ${score}/100\n\n`;
      outputText += '⚠️ You must pass all tests to submit your solution.\n\n';
      outputText += 'Failed tests:\n';
      testResults.filter(t => !t.passed).forEach(t => {
        outputText += `\n${t.name}:\n`;
        outputText += `  Expected: ${t.expectedOutput}\n`;
        outputText += `  Got: ${t.actualOutput}\n`;
        if (t.error) outputText += `  Error: ${t.error}\n`;
      });
      setOutput(outputText);
      addNotification(`❌ Cannot submit: ${passedTests}/${totalTests} tests passed - All tests must pass!`);
    }
  };

  const leaveDuel = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'LEAVE_DUEL' }));
      clearInterval(timerRef.current);
      setGameState('MENU');
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    const message = chatInput.trim();
    
    // Add message locally immediately for better UX
    addChatMessage({
      userId: user?.id,
      nickname: user?.email?.split('@')[0] || 'You',
      message: message,
      timestamp: Date.now()
    });
    
    // Send to server
    ws.send(JSON.stringify({
      type: 'CHAT_MESSAGE',
      message: message
    }));
    
    setChatInput('');
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderMenu = () => (
    <div className="max-w-4xl mx-auto p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-dark-lighter rounded-lg p-8">
        <h1 className="text-4xl font-bold mb-4 text-center">Code Duel Arena</h1>
        <p className="text-gray-400 text-center mb-8">Challenge other developers in real-time coding battles!</p>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">Difficulty</label>
            <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)} className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Language</label>
            <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2">
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
          </div>
        </div>
        <button 
          onClick={joinQueue} 
          disabled={!wsConnected}
          className={`w-full font-bold py-4 rounded-lg text-lg transition ${
            wsConnected 
              ? 'bg-primary hover:bg-primary-dark text-white cursor-pointer' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {wsConnected ? 'Find Opponent' : 'Connecting to server...'}
        </button>
        
        {!wsConnected && (
          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg text-sm text-yellow-200">
            ⚠️ Not connected to game server. Make sure the backend is running:<br/>
            <code className="text-xs bg-dark px-2 py-1 rounded mt-1 inline-block">cd backend && npm run dev:duel</code>
          </div>
        )}

        <div className="mt-8 bg-dark rounded-lg p-6">
          <h3 className="font-semibold mb-4">How It Works</h3>
          <ol className="space-y-2 text-sm text-gray-400">
            <li>1. Select your preferred difficulty and language</li>
            <li>2. Join the matchmaking queue</li>
            <li>3. Get matched with an opponent of similar skill</li>
            <li>4. Race to solve the same coding problem</li>
            <li>5. First to pass all tests wins! Earn XP and climb the leaderboard</li>
          </ol>
        </div>
      </motion.div>
    </div>
  );

  const renderQueue = () => (
    <div className="max-w-2xl mx-auto p-8">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-dark-lighter rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Finding Opponent...</h2>
        <p className="text-gray-400 mb-6">{queuePosition && `Position in queue: ${queuePosition}`}</p>
        <div className="bg-dark rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400">Difficulty: <span className="text-white font-medium">{selectedDifficulty}</span></p>
          <p className="text-sm text-gray-400">Language: <span className="text-white font-medium">{selectedLanguage}</span></p>
        </div>
        <button onClick={leaveQueue} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition">Cancel</button>
      </motion.div>
    </div>
  );

  const renderDuel = () => (
    <div className="h-screen flex flex-col bg-dark">
      <div className="bg-dark-lighter border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-xs text-gray-400">You</p>
              <p className="font-semibold">{user?.email?.split('@')[0]}</p>
            </div>
            <span className="text-2xl">vs</span>
            <div className="text-center">
              <p className="text-xs text-gray-400">Opponent</p>
              <p className="font-semibold">{opponent?.nickname || 'Anonymous'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <p className="text-xs text-gray-400">Time Remaining</p>
              <p className="text-2xl font-mono font-bold text-primary">{formatTime(timeRemaining)}</p>
            </div>
            <button onClick={leaveDuel} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm">Forfeit</button>
          </div>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="bg-dark-lighter p-6 border-b border-gray-700 overflow-auto max-h-48">
            <h2 className="text-xl font-bold mb-2">{duel?.problem?.title}</h2>
            <p className="text-sm text-gray-400 mb-4">Difficulty: <span className="text-primary font-medium">{duel?.problem?.difficulty}</span></p>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300">{duel?.problem?.description}</p>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4 p-4">
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold mb-2 text-gray-300">Code Editor</h3>
              <div className="flex-1 rounded-lg overflow-hidden border border-gray-700">
                <MonacoEditor 
                  height="100%" 
                  language={selectedLanguage} 
                  value={code} 
                  onChange={(value) => setCode(value)} 
                  theme="vs-dark" 
                  options={{ 
                    minimap: { enabled: false }, 
                    fontSize: 14, 
                    lineNumbers: 'on', 
                    scrollBeyondLastLine: false, 
                    automaticLayout: true 
                  }} 
                />
              </div>
              {selectedLanguage !== 'javascript' && (
                <div className="mt-2">
                  <label className="text-xs text-gray-400 mb-1 block">Input (stdin) - Optional</label>
                  <textarea
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    placeholder="Enter test input here..."
                    className="w-full h-16 p-2 rounded border border-gray-700 bg-dark text-sm font-mono resize-none"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold mb-2 text-gray-300">Output & Results</h3>
              <div className="flex-1 rounded-lg overflow-auto border border-gray-700 bg-dark p-4">
                <pre className="text-sm whitespace-pre-wrap font-mono text-gray-300">
                  {output || `💡 Use "Run Code" to test your solution\n💾 Use "Submit Solution" when all tests pass\n\n📊 Results will appear here in real-time\n\n⚡ Your code will be tested against ${((duel?.problem?.tests_public?.length || 0) + (duel?.problem?.tests_hidden?.length || 0)) || ((duel?.problem?.testsPublic?.length || 0) + (duel?.problem?.testsHidden?.length || 0))} test cases`}
                </pre>
              </div>
            </div>
          </div>
          <div className="bg-dark-lighter p-4 border-t border-gray-700">
            {hasCompleted ? (
              <div className="text-center py-3">
                <p className="text-green-500 font-bold mb-2">✅ Solution Submitted!</p>
                <p className="text-sm text-gray-400">
                  {opponentCompleted ? '⏳ Calculating results...' : '⏳ Waiting for opponent to finish...'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={runCode} 
                  disabled={isRunning || isSubmitting} 
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                >
                  {isRunning ? '⚡ Running...' : '▶️ Run Code'}
                </button>
                <button 
                  onClick={submitCode} 
                  disabled={isSubmitting || isRunning} 
                  className="bg-primary hover:bg-primary-dark disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                >
                  {isSubmitting ? '📤 Submitting...' : '✅ Submit Solution'}
                </button>
              </div>
            )}
            {opponentCompleted && !hasCompleted && (
              <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg text-center">
                <p className="text-yellow-400 text-sm font-semibold">⚠️ Opponent has finished! Submit your solution to see results.</p>
              </div>
            )}
            {/* Debug button - remove after testing */}
            {hasCompleted && (
              <div className="mt-3">
                <button 
                  onClick={() => {
                    console.log('Debug: Current states:', { hasCompleted, opponentCompleted, duelId: duel?.id });
                    console.log('Debug: WebSocket state:', ws?.readyState);
                  }}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs"
                >
                  🐛 Debug: Show States
                </button>
              </div>
            )}
          </div>
        </div>
        <motion.div 
          className="bg-dark-lighter border-l border-gray-700 flex flex-col relative"
          animate={{ width: isRightPanelCollapsed ? '48px' : '384px' }}
          transition={{ duration: 0.3 }}
        >
          {/* Collapse/Expand Button */}
          <button
            onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
            className="absolute top-4 -left-3 z-10 w-6 h-6 bg-primary hover:bg-primary-dark rounded-full flex items-center justify-center text-xs transition-colors shadow-lg"
            title={isRightPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isRightPanelCollapsed ? '→' : '←'}
          </button>

          {!isRightPanelCollapsed && (
            <>
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-semibold mb-3">Your Submissions ({submissions.length})</h3>
                <div className="space-y-2 max-h-64 overflow-auto">
              {submissions.map((sub, idx) => (
                <div key={idx} className={`p-3 rounded text-sm ${sub.passed ? 'bg-green-900/30 border-l-4 border-green-500' : 'bg-red-900/30 border-l-4 border-red-500'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">{sub.passed ? '✅ Passed' : '❌ ' + sub.status}</span>
                    <span className="text-xs text-gray-400">{sub.runtime}ms</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Score: {sub.score}/100 • {new Date(sub.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  {sub.testResults && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-gray-400 hover:text-gray-300">View test results</summary>
                      <div className="mt-2 space-y-1 max-h-32 overflow-auto">
                        {sub.testResults.map((test, i) => (
                          <div key={i} className={`p-1 rounded ${test.passed ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                            Test {test.testCase}: {test.passed ? '✅' : '❌'} {test.status}
                            {test.error && <div className="text-red-400 text-xs mt-1">{test.error}</div>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
              {submissions.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No submissions yet</p>}
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold">Chat</h3>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 text-xs mt-8">
                  <p>💬 Chat with your opponent</p>
                  <p className="mt-1">Messages will appear here</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`text-sm ${msg.type === 'system' ? 'text-center text-gray-400 italic' : ''}`}>
                  {msg.type === 'chat' && (
                    <div className={`${msg.userId === user?.id ? 'flex justify-end' : 'flex justify-start'}`}>
                      <div className={`max-w-[80%] p-2 rounded-lg ${msg.userId === user?.id ? 'bg-primary/20' : 'bg-dark'}`}>
                        <div className="font-semibold text-xs text-primary mb-1">{msg.nickname}</div>
                        <div className="break-words">{msg.text}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )}
                  {msg.type === 'system' && <span>{msg.text}</span>}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)} 
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                  placeholder="Type a message..." 
                  className="flex-1 bg-dark border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" 
                  maxLength={200}
                />
                <button 
                  onClick={sendChatMessage} 
                  disabled={!chatInput.trim()}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm transition"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
            </>
          )}

          {/* Collapsed State - Show Icons Only */}
          {isRightPanelCollapsed && (
            <div className="flex flex-col items-center py-4 space-y-4">
              <div className="text-center" title={`${submissions.length} submissions`}>
                <div className="text-2xl mb-1">📊</div>
                <div className="text-xs text-gray-400">{submissions.length}</div>
              </div>
              <div className="text-center" title={`${chatMessages.length} messages`}>
                <div className="text-2xl mb-1">💬</div>
                <div className="text-xs text-gray-400">{chatMessages.length}</div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!results) return null;
    const won = results.player1.userId === user?.id ? results.player1.xpEarned > results.player2.xpEarned : results.player2.xpEarned > results.player1.xpEarned;
    const myResults = results.player1.userId === user?.id ? results.player1 : results.player2;
    const opponentResults = results.player1.userId === user?.id ? results.player2 : results.player1;
    return (
      <div className="max-w-4xl mx-auto p-8">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-dark-lighter rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4">{won ? 'Victory!' : 'Good Effort!'}</h1>
            <p className="text-xl text-gray-400">{won ? 'You defeated your opponent!' : 'Better luck next time!'}</p>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className={`p-6 rounded-lg ${won ? 'bg-green-900/30 border-2 border-green-500' : 'bg-dark'}`}>
              <h3 className="font-semibold mb-4">You</h3>
              <div className="space-y-2">
                <p>Score: <span className="font-bold">{myResults.score}</span></p>
                <p>Time: <span className="font-bold">{myResults.completedAt ? formatTime(myResults.completedAt) : 'Incomplete'}</span></p>
                <p className="text-primary font-bold">+{myResults.xpEarned} XP</p>
              </div>
            </div>
            <div className={`p-6 rounded-lg ${!won ? 'bg-green-900/30 border-2 border-green-500' : 'bg-dark'}`}>
              <h3 className="font-semibold mb-4">{opponentResults.nickname}</h3>
              <div className="space-y-2">
                <p>Score: <span className="font-bold">{opponentResults.score}</span></p>
                <p>Time: <span className="font-bold">{opponentResults.completedAt ? formatTime(opponentResults.completedAt) : 'Incomplete'}</span></p>
                <p className="text-primary font-bold">+{opponentResults.xpEarned} XP</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={joinQueue} className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-lg transition">Play Again</button>
            <button onClick={() => setGameState('MENU')} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition">Back to Menu</button>
          </div>
        </motion.div>
      </div>
    );
  };

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-dark text-white flex items-center justify-center">
        <div className="max-w-md p-8 bg-dark-lighter rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-400 mb-6">
            You need to be logged in to access Code Duel.
          </p>
          <a href="/auth" className="inline-block px-6 py-3 bg-primary hover:bg-primary-dark rounded-lg transition">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white">
      <AnimatePresence mode="wait">
        {gameState === 'MENU' && renderMenu()}
        {gameState === 'QUEUE' && renderQueue()}
        {gameState === 'DUEL' && renderDuel()}
        {gameState === 'RESULTS' && renderResults()}
      </AnimatePresence>
    </div>
  );
};

export default CodeDuel;

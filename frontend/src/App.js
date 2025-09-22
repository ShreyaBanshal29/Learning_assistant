import React, { useState, useEffect, useRef } from "react";
import { StudentProvider, useStudent } from "./context/StudentContext";
import { aiAPI } from "./services/api";
import Login from "./components/Login";
import ChatHistory from "./components/ChatHistory";
import { generateChatTitle } from "./utils/chatTitleGenerator";

function AppContent() {
  const stripMarkdown = (input) => {
    if (!input) return "";
    let text = String(input);
    text = text.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ""));
    text = text.replace(/`([^`]*)`/g, "$1");
    text = text.replace(/!\[([^\]]*)\]\([^\)]*\)/g, "$1");
    text = text.replace(/\[([^\]]*)\]\([^\)]*\)/g, "$1");
    text = text.replace(/^#{1,6}\s+/gm, "");
    text = text.replace(/^>\s?/gm, "");
    text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
    text = text.replace(/__([^_]+)__/g, "$1");
    text = text.replace(/\*([^*]+)\*/g, "$1");
    text = text.replace(/_([^_]+)_/g, "$1");
    text = text.replace(/~~([^~]+)~~/g, "$1");
    text = text.replace(/^\s*[-*+]\s+/gm, "");
    text = text.replace(/^\s*\d+\.\s+/gm, "");
    text = text.replace(/^\s*\[\s?[xX]?\s?\]\s+/gm, "");
    text = text.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "");
    text = text.replace(/[ \t]+$/gm, "");
    text = text.replace(/\n{3,}/g, "\n\n");
    return text.trim();
  };
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const {
    isLoggedIn,
    student,
    currentChat,
    createNewChat,
    addMessage,
    clearCurrentChat,
    loading,
    usage
  } = useStudent();

  const messages = currentChat?.messages || [];
  const hasStarted = messages.length > 0;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setIsCreatingChat(true);

    try {
      let chatIndex = currentChat?.index;

      // If no current chat, create a new one
      if (!chatIndex) {
        const keyword = generateChatTitle(trimmed);
        const newChat = await createNewChat(keyword);
        chatIndex = newChat.index;
      }

      // Add user message to the chat using the chat index
      await addMessage('user', trimmed, chatIndex);
      setInput("");

      // Call Gemini via backend with context
      try {
        const ai = await aiAPI.generate({ prompt: trimmed, student_id: student?.student_id, chatIndex });
        const assistantText = ai?.text ? `${ai.text}` : 'Sorry, I could not generate a response.';
        await addMessage('assistant', stripMarkdown(assistantText), chatIndex);
      } catch (err) {
        console.error('AI error:', err);
        let errorMessage = 'Sorry, there was an error contacting Gemini.';

        if (err?.message?.includes('Daily usage limit reached')) {
          errorMessage = 'Daily usage limit reached. Please come back tomorrow.';
        } else if (err?.message) {
          errorMessage = `Sorry, there was an error: ${err.message}`;
        }

        await addMessage('assistant', stripMarkdown(errorMessage), chatIndex);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsCreatingChat(false);
    }
  };

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleNewChat = () => {
    clearCurrentChat();
    setInput("");
    setShowHistory(false);
    setUploadedFiles([]);
  };

  // Speech Recognition Functions
  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);

        // Show user-friendly error messages
        switch (event.error) {
          case 'no-speech':
            alert('No speech detected. Please try again.');
            break;
          case 'audio-capture':
            alert('Microphone not accessible. Please check your microphone permissions.');
            break;
          case 'not-allowed':
            alert('Microphone access denied. Please allow microphone access and try again.');
            break;
          case 'network':
            alert('Network error occurred. Please check your internet connection.');
            break;
          default:
            alert('Speech recognition failed. Please try again.');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      alert('Failed to start speech recognition. Please try again.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  // File Upload Functions
  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];

    const validFiles = fileArray.filter(file => {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        alert(`File "${file.name}" is not supported. Please upload PDF, DOC, DOCX, TXT, or image files.`);
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files);
    // Clear the input so the same file can be selected again
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // If not logged in, show login page
  if (!isLoggedIn) {
    return <Login />;
  }

  return (
    <div className="app">

      <main
        className={`main ${hasStarted ? "started" : "welcome"}`}
        style={
          hasStarted
            ? undefined
            : {
              backgroundImage: `url(${process.env.PUBLIC_URL}/bg.png)`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "100%",
              backgroundPosition: "center",
            }
        }
      >
        <div className="topbar">

          <div className="title">Learning Assistant</div>
          <div className="user-info">
            <div className="user-details">
              <div className="avatar">
                {student?.student_name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className="user-meta">
                <div className="user-name">{student?.student_name || 'Student'}</div>
                <div className="user-id">ID: {student?.student_id || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="history-row">
          <button className="pill" onClick={() => setShowHistory((v) => !v)}>
            History
          </button>
          <button className="pill" onClick={handleNewChat}>
            New Chat
          </button>
        </div>

        <ChatHistory
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />

        <section className="chat">
          <div className="chat-box">
            <div className="chat-log">
              {messages.map((m, i) => {
                const isUser = m.role === "user";
                const nextMessage = messages[i + 1];
                const isLastMessage = i === messages.length - 1;
                const shouldShowSeparator = isUser && (!nextMessage || nextMessage.role === "assistant");

                return (
                  <div key={i}>
                    
                      <span className="role">{isUser ? "You:" : "Assistant:"}</span>
                      <span className="text">{m.content}</span>
                      <div className="line">
                    {shouldShowSeparator && !isLastMessage && (
                      <div className="message-separator"></div>
                    )}</div>
                  </div>
                );
              })}
              {loading && (
                <div className="line">
                  <span className="role">Assistant:</span>
                  <span className="text typing">Typing...</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <img
              className={`mascot ${hasStarted ? "to-corner" : "at-input"}`}
              src={`${process.env.PUBLIC_URL}/boy.png`}
              alt="assistant"
            />

            <div
              className={`composer ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {uploadedFiles.length > 0 && (
                <div className="uploaded-files">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      <span className="file-name">{file.name}</span>
                      <button
                        className="remove-file"
                        onClick={() => removeFile(index)}
                        title="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {usage?.remainingSeconds === 0 && (
                <div className="usage-banner" style={{
                  background: '#ffe6e6',
                  color: '#a00',
                  padding: '8px 12px',
                  borderRadius: 8,
                  marginBottom: 8,
                  fontWeight: 600
                }}>
                  Daily time limit reached ({Math.round(usage.limitSeconds / 60)} minutes used). Please come back tomorrow.
                </div>
              )}
              {usage?.remainingSeconds > 0 && usage?.remainingSeconds < 300 && (
                <div className="usage-banner" style={{
                  background: '#fff3cd',
                  color: '#856404',
                  padding: '8px 12px',
                  borderRadius: 8,
                  marginBottom: 8,
                  fontWeight: 600
                }}>
                  ⚠️ Low usage remaining: {Math.round(usage.remainingSeconds / 60)} minutes left
                </div>
              )}
              <div className="composer-input-row">
                <input
                  className="input"
                  placeholder={
                    isCreatingChat
                      ? "Creating new chat..."
                      : "Ask your Learning Assistant anything..."
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading || isCreatingChat}
                />
                <div className="composer-actions">
                  <button
                    className={`mic ${isRecording ? 'recording' : ''}`}
                    title="Voice input"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={loading || isCreatingChat}
                  >
                    {isRecording ? '⏹️' : '🎤'}
                  </button>
                  <button
                    className="attach"
                    title="Attach file"
                    onClick={openFileDialog}
                    disabled={loading || isCreatingChat}
                  >
                    📎
                  </button>
                  <button
                    className="send"
                    onClick={handleSend}
                    disabled={loading || isCreatingChat}
                  >
                    ➤
                  </button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
              />
            </div>

          </div>
        </section>
      </main>
      {/* rightbar removed as per request */}
    </div>
  );
}

function App() {
  return (
    <StudentProvider>
      <AppContent />
    </StudentProvider>
  );
}

export default App;

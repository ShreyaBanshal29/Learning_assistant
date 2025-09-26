import React, { createContext, useContext, useState, useEffect } from 'react';
import { studentAPI, authAPI } from '../services/api';
import { getTokenFromURL, removeTokenFromURL, isTokenAuthMode } from '../utils/tokenUtils';

const StudentContext = createContext();

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};

export const StudentProvider = ({ children }) => {
  const [student, setStudent] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usage, setUsage] = useState({ usedSeconds: 0, remainingSeconds: 30 * 60, limitSeconds: 30 * 60 });

  // Token-based login function
  const loginWithToken = async (usertoken) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.verifyToken(usertoken);
      setStudent(response.student);
     setChatHistory(response.student.history || []);
      setIsLoggedIn(true);

      // Remove token from URL for security
      removeTokenFromURL();

      // fetch initial usage status
      try {
        const usageStatus = await studentAPI.getUsage(response.student.student_id);
        if (usageStatus?.success) setUsage({
          usedSeconds: usageStatus.usedSeconds,
          remainingSeconds: usageStatus.remainingSeconds,
          limitSeconds: usageStatus.limitSeconds
        });
      } catch (e) {
        // non-fatal
      }

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Traditional login function (for backward compatibility)
  const login = async (studentId, studentName) => {
    setLoading(true);
    setError(null);
    try {
      const response = await studentAPI.login(studentId, studentName);
      setStudent(response.student);
      setChatHistory(response.student.history || []);
      setIsLoggedIn(true);
      // fetch initial usage status
      try {
        const usageStatus = await studentAPI.getUsage(studentId);
        if (usageStatus?.success) setUsage({
          usedSeconds: usageStatus.usedSeconds,
          remainingSeconds: usageStatus.remainingSeconds,
          limitSeconds: usageStatus.limitSeconds
        });
      } catch (e) {
        // non-fatal
      }
      // Best-effort sync of external data for contextual answers
      try {
        const token = process.env.REACT_APP_EXTERNAL_API_TOKEN;
        await studentAPI.syncExternal(studentId, token ? { apiToken: token } : {});
      } catch (e) {
        // non-fatal; keep login flow smooth
        console.warn('External data sync failed:', e?.message || e);
      }
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setStudent(null);
    setIsLoggedIn(false);
    setChatHistory([]);
    setCurrentChat(null);
    setError(null);
    setUsage({ usedSeconds: 0, remainingSeconds: 30 * 60, limitSeconds: 30 * 60 });
  };

  // Refresh chat history
  const refreshHistory = async () => {
    if (!student) return;
    try {
      const response = await studentAPI.getHistory(student.student_id);
      setChatHistory(response.history);
    } catch (err) {
      setError(err.message);
    }
  };

  // Auto-authenticate with token on app load
  useEffect(() => {
    const handleTokenAuth = async () => {
      if (isTokenAuthMode() && !isLoggedIn) {
        const token = getTokenFromURL();
        if (token) {
          try {
            await loginWithToken(token);
          } catch (error) {
            console.error('Token authentication failed:', error);
            setError('Token authentication failed. Please try again.');
          }
        }
      }
    };

    handleTokenAuth();
  }, []); // Run only once on mount

  // Heartbeat usage while logged in
  useEffect(() => {
    if (!student?.student_id) return;
    let timerId;
    const tick = async () => {
      try {
        const status = await studentAPI.usageHeartbeat(student.student_id, 15);
        if (status?.success) {
          setUsage({
            usedSeconds: status.usedSeconds,
            remainingSeconds: status.remainingSeconds,
            limitSeconds: status.limitSeconds
          });
        }
      } catch (e) {
        // swallow
      }
    };
    // fire immediately and then every 15s
    tick();
    timerId = setInterval(tick, 15000);
    return () => clearInterval(timerId);
  }, [student?.student_id]);

  // Load specific chat
  const loadChat = async (chatIndex) => {
    if (!student) return;
    setLoading(true);
    try {
      const response = await studentAPI.getChat(student.student_id, chatIndex);
      setCurrentChat(response.chat);
      return response.chat;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create new chat
  const createNewChat = async (keyword) => {
    if (!student) return;
    setLoading(true);
    try {
      const response = await studentAPI.createChat(student.student_id, keyword);
      await refreshHistory(); // Refresh the history list
      setCurrentChat(response.chat);
      return response.chat;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add message to current chat
  const addMessage = async (role, content, chatIndex = null) => {
    if (!student) return;

    // Use provided chatIndex or current chat index
    const targetChatIndex = chatIndex || currentChat?.index;
    if (!targetChatIndex) {
      throw new Error('No chat available to add message to');
    }

    try {
      const response = await studentAPI.addMessage(
        student.student_id,
        targetChatIndex,
        role,
        content
      );
      setCurrentChat(response.chat);
      // Ensure history sidebar reflects latest message counts and ordering
      try {
        await refreshHistory();
      } catch { }
      // optimistic: refresh usage after user message attempt
      try {
        const usageStatus = await studentAPI.getUsage(student.student_id);
        if (usageStatus?.success) setUsage({
          usedSeconds: usageStatus.usedSeconds,
          remainingSeconds: usageStatus.remainingSeconds,
          limitSeconds: usageStatus.limitSeconds
        });
      } catch { }
      return response.chat;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Update chat keyword
  const updateChatKeyword = async (chatIndex, keyword) => {
    if (!student) return;
    try {
      await studentAPI.updateChatKeyword(student.student_id, chatIndex, keyword);
      await refreshHistory(); // Refresh the history list
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Delete chat
  const deleteChat = async (chatIndex) => {
    if (!student) return;
    try {
      await studentAPI.deleteChat(student.student_id, chatIndex);
      await refreshHistory(); // Refresh the history list

      // If we deleted the current chat, clear it
      if (currentChat && currentChat.index === chatIndex) {
        setCurrentChat(null);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Clear current chat
  const clearCurrentChat = () => {
    setCurrentChat(null);
  };


  const value = {
    student,
    isLoggedIn,
    chatHistory,
    currentChat,
    loading,
    usage,
    error,
    login,
    loginWithToken,
    logout,
    refreshHistory,
    loadChat,
    createNewChat,
    addMessage,
    updateChatKeyword,
    deleteChat,
    clearCurrentChat,
  };

  return (
    <StudentContext.Provider value={value}>
      {children}
    </StudentContext.Provider>
  );
};

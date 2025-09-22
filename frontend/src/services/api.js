import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  // Use relative path with CRA proxy during development; env can override
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Student API functions
export const studentAPI = {
  // Login or create student
  login: async (studentId, studentName) => {
    try {
      const response = await api.post('/students/login', {
        student_id: studentId,
        student_name: studentName,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  // Get usage status for today
  getUsage: async (studentId) => {
    try {
      const response = await api.get(`/students/${studentId}/usage`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch usage');
    }
  },

  // Heartbeat to accrue usage seconds
  usageHeartbeat: async (studentId, seconds = 15) => {
    try {
      const response = await api.post(`/students/${studentId}/usage/heartbeat`, { seconds });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update usage');
    }
  },

  // Get student's chat history summary
  getHistory: async (studentId) => {
    try {
      const response = await api.get(`/students/${studentId}/history`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch history');
    }
  },

  // Get specific chat by index
  getChat: async (studentId, chatIndex) => {
    try {
      const response = await api.get(`/students/${studentId}/chat/${chatIndex}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch chat');
    }
  },

  // Create new chat
  createChat: async (studentId, keyword) => {
    try {
      const response = await api.post(`/students/${studentId}/chat`, {
        keyword: keyword,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create chat');
    }
  },

  // Add message to chat
  addMessage: async (studentId, chatIndex, role, content) => {
    try {
      const response = await api.post(`/students/${studentId}/chat/${chatIndex}/message`, {
        role: role,
        content: content,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to add message');
    }
  },

  // Update chat keyword
  updateChatKeyword: async (studentId, chatIndex, keyword) => {
    try {
      const response = await api.put(`/students/${studentId}/chat/${chatIndex}/keyword`, {
        keyword: keyword,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update keyword');
    }
  },

  // Delete chat
  deleteChat: async (studentId, chatIndex) => {
    try {
      const response = await api.delete(`/students/${studentId}/chat/${chatIndex}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete chat');
    }
  },

  // Sync external student data into backend DB
  syncExternal: async (studentId, options = {}) => {
    try {
      const token = options.apiToken;
      const response = await api.post(
        `/students/${studentId}/sync`,
        options,
        token ? { headers: { 'X-API-TOKEN': token } } : undefined
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to sync external data');
    }
  },

};

export default api;

// Auth API
export const authAPI = {
  // Verify token with main website
  verifyToken: async (usertoken) => {
    try {
      const response = await api.post('/auth/verify-token', {
        usertoken: usertoken,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Token verification failed');
    }
  },
};

// AI API
export const aiAPI = {
  generate: async ({ prompt, systemInstruction, student_id, chatIndex }) => {
    try {
      const response = await api.post('/ai/generate', { prompt, systemInstruction, student_id, chatIndex });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to generate AI response';
      const hint = error.response?.data?.hint;
      throw new Error(hint ? `${msg} (${hint})` : msg);
    }
  }
};

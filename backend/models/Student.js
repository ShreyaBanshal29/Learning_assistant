import mongoose from 'mongoose';

// Message schema for individual chat messages
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Chat schema for individual chat sessions
const chatSchema = new mongoose.Schema({
  index: {
    type: Number,
    required: true
  },
  keyword: {
    type: String,
    required: true,
    trim: true
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Student schema
const studentSchema = new mongoose.Schema({
  student_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  student_name: {
    type: String,
    required: true,
    trim: true
  },
  history: [chatSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
studentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update chat updatedAt when messages are modified
chatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to get the next chat index for a student
studentSchema.methods.getNextChatIndex = function() {
  if (this.history.length === 0) {
    return 1;
  }
  return Math.max(...this.history.map(chat => chat.index)) + 1;
};

// Method to add a new chat
studentSchema.methods.addChat = function(keyword) {
  const newIndex = this.getNextChatIndex();
  const newChat = {
    index: newIndex,
    keyword: keyword,
    messages: []
  };
  this.history.push(newChat);
  return newChat;
};

// Method to get chat by index
studentSchema.methods.getChatByIndex = function(index) {
  return this.history.find(chat => chat.index === index);
};

// Method to add message to a chat
studentSchema.methods.addMessageToChat = function(chatIndex, role, content) {
  const chat = this.getChatByIndex(chatIndex);
  if (chat) {
    chat.messages.push({
      role: role,
      content: content,
      timestamp: new Date()
    });
    chat.updatedAt = new Date();
    return chat;
  }
  return null;
};

// Method to get chat history summary (just keywords and indices)
studentSchema.methods.getHistorySummary = function() {
  return this.history.map(chat => ({
    index: chat.index,
    keyword: chat.keyword,
    messageCount: chat.messages.length,
    lastUpdated: chat.updatedAt
  })).sort((a, b) => b.lastUpdated - a.lastUpdated); // Sort by most recent first
};

const Student = mongoose.model('Student', studentSchema);

export default Student;

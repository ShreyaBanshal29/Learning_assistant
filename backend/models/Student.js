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
  // Track per-day usage in seconds. Keys are YYYY-MM-DD strings.
  dailyUsageSecondsByDate: {
    type: Map,
    of: Number,
    default: {}
  },
  // Optional server-maintained current session start timestamp
  currentSessionStartedAt: {
    type: Date,
    default: null
  },
  dailyUsageSecondsLimit: {
    type: Number,
    default: 30 * 60 // 30 minutes
  },
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
studentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Update chat updatedAt when messages are modified
chatSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to get the next chat index for a student
studentSchema.methods.getNextChatIndex = function () {
  if (this.history.length === 0) {
    return 1;
  }
  return Math.max(...this.history.map(chat => chat.index)) + 1;
};

// Method to add a new chat
studentSchema.methods.addChat = function (keyword) {
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
studentSchema.methods.getChatByIndex = function (index) {
  return this.history.find(chat => chat.index === index);
};

// Method to add message to a chat
studentSchema.methods.addMessageToChat = function (chatIndex, role, content) {
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
studentSchema.methods.getHistorySummary = function () {
  return this.history.map(chat => ({
    index: chat.index,
    keyword: chat.keyword,
    messageCount: chat.messages.length,
    lastUpdated: chat.updatedAt
  })).sort((a, b) => b.lastUpdated - a.lastUpdated); // Sort by most recent first
};

// ---- Usage Tracking Helpers ----
function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

studentSchema.methods.getTodayUsedSeconds = function (now = new Date()) {
  const key = getLocalDateKey(now);
  const used = Number(this.dailyUsageSecondsByDate?.get?.(key) || 0);
  return isNaN(used) ? 0 : used;
};

studentSchema.methods.getTodayRemainingSeconds = function (now = new Date()) {
  const limit = Number(this.dailyUsageSecondsLimit || 0);
  const used = this.getTodayUsedSeconds(now);
  return Math.max(0, limit - used);
};

studentSchema.methods.incrementUsage = function (seconds, now = new Date()) {
  if (!seconds || seconds <= 0) return this.getTodayUsedSeconds(now);
  const key = getLocalDateKey(now);
  const prior = this.getTodayUsedSeconds(now);
  const limit = Number(this.dailyUsageSecondsLimit || 0);
  const allowedIncrement = Math.max(0, Math.min(seconds, Math.max(0, limit - prior)));
  const next = prior + allowedIncrement;
  this.dailyUsageSecondsByDate.set(key, next);
  return next;
};

studentSchema.methods.startSessionIfNeeded = function (now = new Date()) {
  if (!this.currentSessionStartedAt) {
    this.currentSessionStartedAt = now;
  }
};

studentSchema.methods.stopSessionAndAccrue = function (now = new Date()) {
  if (!this.currentSessionStartedAt) return;
  const start = new Date(this.currentSessionStartedAt);
  const end = new Date(now);
  if (end <= start) {
    this.currentSessionStartedAt = null;
    return;
  }

  // Accrue usage day by day across local midnight boundaries
  let cursor = new Date(start);
  while (cursor < end) {
    const nextMidnight = new Date(cursor);
    nextMidnight.setHours(24, 0, 0, 0); // local midnight end of current day
    const segmentEnd = nextMidnight < end ? nextMidnight : end;
    const segmentSeconds = Math.floor((segmentEnd - cursor) / 1000);
    this.incrementUsage(segmentSeconds, cursor);
    cursor = segmentEnd;
  }

  this.currentSessionStartedAt = null;
};

studentSchema.methods.getUsageStatus = function (now = new Date()) {
  const used = this.getTodayUsedSeconds(now);
  const limit = Number(this.dailyUsageSecondsLimit || 0);
  const remaining = Math.max(0, limit - used);
  return { usedSeconds: used, remainingSeconds: remaining, limitSeconds: limit };
};

// ---- Retention / Pruning Helpers ----
studentSchema.methods.pruneHistoryByDays = function (days = 30) {
  const safeDays = Math.max(0, Number(days) || 0);
  if (safeDays === 0) return; // 0 means keep all
  const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  this.history = this.history.filter(chat => {
    try {
      const updatedAt = new Date(chat.updatedAt || chat.createdAt || 0);
      return updatedAt >= cutoff;
    } catch {
      return true;
    }
  });
};

studentSchema.methods.pruneUsageByDays = function (days = 30) {
  const safeDays = Math.max(0, Number(days) || 0);
  if (safeDays === 0) return;
  const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  // Keys are YYYY-MM-DD, compare by parsing back to Date at local midnight
  if (this.dailyUsageSecondsByDate && typeof this.dailyUsageSecondsByDate.forEach === 'function') {
    const toDelete = [];
    this.dailyUsageSecondsByDate.forEach((_, key) => {
      try {
        const [y, m, d] = String(key).split('-').map(Number);
        const keyDate = new Date(y, (m || 1) - 1, d || 1);
        if (keyDate < cutoff) toDelete.push(key);
      } catch { }
    });
    for (const k of toDelete) this.dailyUsageSecondsByDate.delete(k);
  }
};

studentSchema.methods.pruneDataByDays = function (days = 30) {
  this.pruneHistoryByDays(days);
  this.pruneUsageByDays(days);
};

const Student = mongoose.model('Student', studentSchema);

export default Student;

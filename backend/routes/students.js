import express from 'express';
import Student from '../models/Student.js';
import StudentExternal from '../models/StudentExternal.js';
import fetch from 'node-fetch';

const router = express.Router();

// Helper: fetch or 404 student
async function requireStudent(student_id) {
  const student = await Student.findOne({ student_id });
  if (!student) {
    const err = new Error('Student not found');
    err.status = 404;
    throw err;
  }
  return student;
}

// Student login/authentication endpoint
router.post('/login', async (req, res) => {
  try {
    const { student_id, student_name } = req.body;

    if (!student_id || !student_name) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and name are required'
      });
    }

    // Find existing student or create new one
    let student = await Student.findOne({ student_id });

    if (!student) {
      // Create new student
      student = new Student({
        student_id,
        student_name,
        history: []
      });
      // Prune old data based on retention window
      const days = Number(process.env.RETENTION_DAYS || 30);
      student.pruneDataByDays(days);
      await student.save();

      return res.status(201).json({
        success: true,
        message: 'New student created successfully',
        student: {
          student_id: student.student_id,
          student_name: student.student_name,
          history: student.getHistorySummary()
        }
      });
    } else {
      // Update student name if it has changed
      if (student.student_name !== student_name) {
        student.student_name = student_name;
        const days = Number(process.env.RETENTION_DAYS || 30);
        student.pruneDataByDays(days);
        await student.save();
      }

      // Refresh StudentExternal TTL expiry (15 minutes sliding window)
      try {
        const ttlMinutes = Number(process.env.EXTERNAL_TTL_MINUTES || 15);
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
        await StudentExternal.updateOne(
          { student_id },
          { $set: { expiresAt } },
          { upsert: true }
        );
      } catch { }

      return res.status(200).json({
        success: true,
        message: 'Student login successful',
        student: {
          student_id: student.student_id,
          student_name: student.student_name,
          history: student.getHistorySummary()
        }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: error.message
    });
  }
});

// ----- Usage tracking endpoints -----
// Get today's usage status
router.get('/:student_id/usage', async (req, res) => {
  try {
    const { student_id } = req.params;
    const student = await requireStudent(student_id);
    const status = student.getUsageStatus();
    return res.status(200).json({ success: true, ...status });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to get usage' });
  }
});

// Heartbeat: increment usage by N seconds and return remaining
router.post('/:student_id/usage/heartbeat', async (req, res) => {
  try {
    const { student_id } = req.params;
    const { seconds = 15 } = req.body || {};
    const increment = Math.max(0, Math.min(300, Number(seconds) || 0)); // cap to 5 minutes
    const student = await requireStudent(student_id);
    // accrue any active session up to now then start a new session slice
    student.stopSessionAndAccrue(new Date());
    student.incrementUsage(increment);
    student.startSessionIfNeeded(new Date());
    // Prune old data each heartbeat
    const days = Number(process.env.RETENTION_DAYS || 30);
    student.pruneDataByDays(days);
    await student.save();
    // Refresh StudentExternal TTL expiry window as user is active
    try {
      const ttlMinutes = Number(process.env.EXTERNAL_TTL_MINUTES || 15);
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      await StudentExternal.updateOne(
        { student_id },
        { $set: { expiresAt } },
        { upsert: true }
      );
    } catch { }
    const status = student.getUsageStatus();
    return res.status(200).json({ success: true, ...status });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to update usage' });
  }
});

// Admin: reset today's usage for a student
router.post('/:student_id/reset-usage', async (req, res) => {
  try {
    const { student_id } = req.params;
    const student = await requireStudent(student_id);
    // Reset today's entry and stop any active session
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${day}`;
    if (student.dailyUsageSecondsByDate?.has?.(key)) {
      student.dailyUsageSecondsByDate.set(key, 0);
    }
    student.currentSessionStartedAt = null;
    await student.save();
    const usage = student.getUsageStatus();
    return res.status(200).json({ success: true, message: 'Usage reset for today', usage });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to reset usage' });
  }
});

// Get student's chat history summary
router.get('/:student_id/history', async (req, res) => {
  try {
    const { student_id } = req.params;

    const student = await Student.findOne({ student_id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      history: student.getHistorySummary()
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving chat history',
      error: error.message
    });
  }
});

// Get specific chat by index
router.get('/:student_id/chat/:index', async (req, res) => {
  try {
    const { student_id, index } = req.params;
    const chatIndex = parseInt(index);

    if (isNaN(chatIndex)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chat index'
      });
    }

    const student = await Student.findOne({ student_id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const chat = student.getChatByIndex(chatIndex);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.status(200).json({
      success: true,
      chat: {
        index: chat.index,
        keyword: chat.keyword,
        messages: chat.messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving chat',
      error: error.message
    });
  }
});

// Create a new chat
router.post('/:student_id/chat', async (req, res) => {
  try {
    const { student_id } = req.params;
    const { keyword } = req.body;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'Keyword is required'
      });
    }

    const student = await Student.findOne({ student_id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const newChat = student.addChat(keyword);
    await student.save();

    res.status(201).json({
      success: true,
      message: 'New chat created successfully',
      chat: {
        index: newChat.index,
        keyword: newChat.keyword,
        messages: newChat.messages,
        createdAt: newChat.createdAt
      }
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating new chat',
      error: error.message
    });
  }
});

// Add message to a chat
router.post('/:student_id/chat/:index/message', async (req, res) => {
  try {
    const { student_id, index } = req.params;
    const { role, content } = req.body;
    const chatIndex = parseInt(index);

    if (isNaN(chatIndex)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chat index'
      });
    }

    if (!role || !content) {
      return res.status(400).json({
        success: false,
        message: 'Role and content are required'
      });
    }

    if (!['user', 'assistant'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "user" or "assistant"'
      });
    }

    const student = await Student.findOne({ student_id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Enforce usage limit: user messages are blocked when time is exhausted
    const usage = student.getUsageStatus();
    if (role === 'user' && usage.remainingSeconds <= 0) {
      return res.status(429).json({
        success: false,
        message: 'Daily usage limit reached. Please come back tomorrow.',
        usage: {
          usedSeconds: usage.usedSeconds,
          remainingSeconds: usage.remainingSeconds,
          limitSeconds: usage.limitSeconds,
          usedMinutes: Math.round(usage.usedSeconds / 60),
          remainingMinutes: Math.round(usage.remainingSeconds / 60),
          limitMinutes: Math.round(usage.limitSeconds / 60)
        }
      });
    }

    const updatedChat = student.addMessageToChat(chatIndex, role, content);

    if (!updatedChat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    await student.save();

    res.status(201).json({
      success: true,
      message: 'Message added successfully',
      chat: {
        index: updatedChat.index,
        keyword: updatedChat.keyword,
        messages: updatedChat.messages
      }
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding message to chat',
      error: error.message
    });
  }
});

// Update chat keyword
router.put('/:student_id/chat/:index/keyword', async (req, res) => {
  try {
    const { student_id, index } = req.params;
    const { keyword } = req.body;
    const chatIndex = parseInt(index);

    if (isNaN(chatIndex)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chat index'
      });
    }

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'Keyword is required'
      });
    }

    const student = await Student.findOne({ student_id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const chat = student.getChatByIndex(chatIndex);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    chat.keyword = keyword;
    chat.updatedAt = new Date();
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Chat keyword updated successfully',
      chat: {
        index: chat.index,
        keyword: chat.keyword,
        messages: chat.messages,
        updatedAt: chat.updatedAt
      }
    });
  } catch (error) {
    console.error('Update keyword error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating chat keyword',
      error: error.message
    });
  }
});

// Delete a chat
router.delete('/:student_id/chat/:index', async (req, res) => {
  try {
    const { student_id, index } = req.params;
    const chatIndex = parseInt(index);

    if (isNaN(chatIndex)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chat index'
      });
    }

    const student = await Student.findOne({ student_id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const chatIndexToDelete = student.history.findIndex(chat => chat.index === chatIndex);

    if (chatIndexToDelete === -1) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const deletedChat = student.history.splice(chatIndexToDelete, 1)[0];
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Chat deleted successfully',
      deletedChat: {
        index: deletedChat.index,
        keyword: deletedChat.keyword
      }
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting chat',
      error: error.message
    });
  }
});

export default router;

// --- External data sync routes ---
router.post('/:student_id/sync', async (req, res) => {
  try {
    const { student_id } = req.params;
    const {
      profileId = '2',
      attendanceStudentId = '45',
      assignmentsStudentId = '45',
      examStudentId = '45',
      enrollmentStudentId = '45',
      examIds = ['17']
    } = req.body || {};
    const providedToken = req.headers['x-api-token'] || req.body?.apiToken || process.env.EXTERNAL_API_TOKEN;

    const endpoints = {
      profile: `https://alnada.eprime.app/api/students/${profileId}`,
      attendanceSummaryMonthly: `https://alnada.eprime.app/api/student/attendance/summary/monthly/${attendanceStudentId}`,
      attendanceDetails: `https://alnada.eprime.app/api/student/attendance/details/${attendanceStudentId}`,
      assignments: `https://alnada.eprime.app/api/student/assignments/${assignmentsStudentId}`,
      examList: `https://alnada.eprime.app/api/student/ExamList/${examStudentId}`,
      enrollment: `https://alnada.eprime.app/api/students/enrollment/${enrollmentStudentId}`,
    };

    // Fetch helpers
    const safeJson = async (url) => {
      try {
        const r = await fetch(url, {
          timeout: 20000,
          headers: {
            'X-API-TOKEN': providedToken || 'RvpA6SuRQyydHIeZkyxbYViBmj5jVkODaTvZc24dbjE9XoKpxSM3KQy15zowmF0xaMkHcriCbt4abuMtvms54wtmWoXxESGxcvLeKvIM9ZFLblzzogMds9E8z3toxCYlE9kws9hqOAFbQo0wjHLESaX2FHcufLMlXhjx',
            'Content-Type': 'application/json'
          }
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
      } catch (e) {
        return { error: true, message: String(e), url };
      }
    };

    const [profile, attendanceSummaryMonthly, attendanceDetails, assignments, examList, enrollment] = await Promise.all([
      safeJson(endpoints.profile),
      safeJson(endpoints.attendanceSummaryMonthly),
      safeJson(endpoints.attendanceDetails),
      safeJson(endpoints.assignments),
      safeJson(endpoints.examList),
      safeJson(endpoints.enrollment)
    ]);

    const examDataByExamId = new Map();
    for (const id of examIds) {
      const data = await safeJson(`https://alnada.eprime.app/api/student/ExamData/${examStudentId}/${id}`);
      examDataByExamId.set(String(id), data);
    }

    let doc = await StudentExternal.findOne({ student_id });
    if (!doc) {
      doc = new StudentExternal({ student_id });
    }

    doc.sourceIds = { profileId, attendanceStudentId, assignmentsStudentId, examStudentId, enrollmentStudentId, examIds };
    doc.profile = profile;
    doc.attendanceSummaryMonthly = attendanceSummaryMonthly;
    doc.attendanceDetails = attendanceDetails;
    doc.assignments = assignments;
    doc.examList = examList;
    doc.examDataByExamId = examDataByExamId;
    doc.enrollment = enrollment;
    await doc.save();

    res.status(200).json({ success: true, message: 'Synced external data', student_id, snapshotUpdatedAt: doc.updatedAt });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync external data', error: error.message });
  }
});

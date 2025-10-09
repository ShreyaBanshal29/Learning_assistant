import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Student from '../models/Student.js';
import StudentExternal from '../models/StudentExternal.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";

dotenv.config();
const INSTITUTE_NAME = process.env.INSTITUTE_NAME || 'Al Nada Coaching Institute';
const ASSISTANT_NAME = process.env.ASSISTANT_NAME || 'Alithea';

const router = express.Router();

// Base system prompt for Al Nada Coaching Institute Learning Assistant
const BASE_SYSTEM_PROMPT = [
  `You are a Learning Assistant (${ASSISTANT_NAME}) for ${INSTITUTE_NAME}.`,
  `Your job is to guide students, answer their queries about academics, attendance, assignments, and exams, and provide helpful learning support.`,
  '',
  'Rules:',
  '1. Always respond as a teacher/assistant of the institute.',
  '2. Never reveal that you are an AI, Gemini, or that data is being sent to you.',
  '3. Use the provided student data silently — do not mention it unless needed to answer the student.',
  '4. Be polite, supportive, and professional. Use a warm, educational tone.'
].join('\n');

router.get('/ping', (req, res) => {
  const apiKeySet = Boolean(process.env.GEMINI_API_KEY);
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
  const nodeVersion = process.version;
  return res.status(200).json({
    success: true,
    apiKeyDetected: apiKeySet,
    model: modelName,
    node: nodeVersion,
    provider: 'gemini'
  });
});

router.post('/generate', async (req, res) => {
  try {
    const { prompt, systemInstruction, student_id, chatIndex } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, message: 'prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';

    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'GEMINI_API_KEY is not set' });
    }

    // Enforce usage limit if student_id provided
    if (student_id) {
      try {
        const student = await Student.findOne({ student_id });
        if (student) {
          const usage = student.getUsageStatus();
          if (usage.remainingSeconds <= 0) {
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
        }
      } catch { }
    }

    // Build LangChain chat model
    const chat = new ChatGoogleGenerativeAI({
      apiKey,
      model: modelName,
      temperature: 0.2,
      maxOutputTokens: 1024,
      safetySettings: undefined
    });

    // Fetch chat history if available
    const lcMessages = [];
    // Merge base institutional rules with any caller-provided systemInstruction
    const mergedSystemInstruction = [BASE_SYSTEM_PROMPT, systemInstruction]
      .filter(Boolean)
      .join('\n\n');
    lcMessages.push(new SystemMessage(mergedSystemInstruction));

    if (student_id && chatIndex) {
      try {
        const student = await Student.findOne({ student_id });
        const chatDoc = student?.getChatByIndex?.(Number(chatIndex));
        if (chatDoc?.messages?.length) {
          const lastMessages = chatDoc.messages.slice(-8); // limit tokens
          for (const m of lastMessages) {
            if (m.role === 'user') lcMessages.push(new HumanMessage(m.content));
            else lcMessages.push(new AIMessage(m.content));
          }
        }
      } catch { }
    }

    // Fetch contextual student data snapshot
    let contextSnippet = '';
    const extractAssignmentsArray = (raw) => {
      if (!raw) return [];
      // common shapes: { data: [...] } or { assignments: [...] } or direct array
      const candidates = [raw, raw?.data, raw?.assignments, raw?.Assignments, raw?.items, raw?.result];
      for (const c of candidates) {
        if (Array.isArray(c) && c.length) return c;
      }
      // fallback: search first array value in object
      if (typeof raw === 'object') {
        for (const k of Object.keys(raw)) {
          if (Array.isArray(raw[k]) && raw[k].length) return raw[k];
        }
      }
      return [];
    };
    const summarizeAssignments = (arr) => {
      if (!Array.isArray(arr)) return { count: 0 };
      const normalize = (a) => ({
        id: a?.id || a?.AssignmentId || a?._id || undefined,
        title: a?.title || a?.Title || a?.name || a?.Name || 'Assignment',
        subject: a?.subject || a?.Subject || a?.course || a?.Course || undefined,
        status: a?.status || a?.Status || undefined,
        dueDate: a?.dueDate || a?.DueDate || a?.due || a?.Due || a?.deadline || undefined,
        score: a?.score || a?.Score || undefined,
      });
      const normalized = arr.slice(0, 10).map(normalize);
      const upcoming = normalized.filter(x => x.dueDate);
      return { count: arr.length, preview: normalized, upcoming: upcoming.slice(0, 5) };
    };
    if (student_id) {
      const ext = await StudentExternal.findOne({ student_id });
      if (ext) {
        const summary = {
          profile: ext.profile,
          attendanceSummaryMonthly: ext.attendanceSummaryMonthly,
          latestAttendance: Array.isArray(ext.attendanceDetails?.data) ? ext.attendanceDetails.data.slice(-5) : ext.attendanceDetails,
          assignmentsSummary: summarizeAssignments(extractAssignmentsArray(ext.assignments)),
          examList: ext.examList,
          latestExamData: (() => {
            const lastExamId = Array.isArray(ext.examList?.data) && ext.examList.data.length ? ext.examList.data[ext.examList.data.length - 1]?.id || ext.examList.data[ext.examList.data.length - 1]?.ExamId : undefined;
            if (!lastExamId) return undefined;
            return ext.examDataByExamId?.get(String(lastExamId));
          })(),
          enrollment: ext.enrollment
        };
        contextSnippet = `Contextual student data (JSON):\n${JSON.stringify(summary).slice(0, 2000)}`; // cap size
      }
    }

    // Append current user question
    lcMessages.push(new HumanMessage(`${contextSnippet ? contextSnippet + '\n\n' : ''}User question: ${prompt}`));


async function safeInvoke(chat, messages, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await chat.invoke(messages);
      return result;
    } catch (err) {
      console.error(`Attempt ${i + 1} failed:`, err.message);
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
    const result = await safeInvoke(chat, lcMessages);

    const text = result?.content ?? '';

    return res.status(200).json({ success: true, text, model: modelName, provider: 'gemini', usedContext: Boolean(contextSnippet) });
  } catch (error) {
    console.error('Gemini generate error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to generate content';
    // Common hints to help debugging
    const hint =
      message.toLowerCase().includes('api key') || message.toLowerCase().includes('invalid')
        ? 'The API key may be missing or invalid.'
        : message.toLowerCase().includes('quota')
          ? 'Quota exceeded for your Gemini API key.'
          : message.toLowerCase().includes('network')
            ? 'Network issue while contacting Gemini.'
            : undefined;
    return res.status(500).json({
  success: false,
  message,
  hint,
  errorType: error?.response?.statusText || 'Unknown Error'
});
  }
});

export default router;



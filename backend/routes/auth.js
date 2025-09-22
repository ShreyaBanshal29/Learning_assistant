import express from 'express';
import Student from '../models/Student.js';
import StudentExternal from '../models/StudentExternal.js';
import fetch from 'node-fetch';

const router = express.Router();

// Token authentication endpoint
router.post('/verify-token', async (req, res) => {
    try {
        const { usertoken } = req.body;

        if (!usertoken) {
            return res.status(400).json({
                success: false,
                message: 'User token is required'
            });
        }

    // Call the main website's authentication API
    const authApiUrl = `https://alnada.eprime.app/api/verify-token/${usertoken}`;
    const apiToken = 'RvpA6SuRQyydHIeZkyxbYViBmj5jVkODaTvZc24dbjE9XoKpxSM3KQy15zowmF0xaMkHcriCbt4abuMtvms54wtmWoXxESGxcvLeKvIM9ZFLblzzogMds9E8z3toxCYlE9kws9hqOAFbQo0wjHLESaX2FHcufLMlXhjx';
    
    let studentMetadata;
    try {
      const authResponse = await fetch(authApiUrl, {
        method: 'GET',
        headers: {
          'X-API-TOKEN': apiToken,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      if (!authResponse.ok) {
        throw new Error(`Authentication API returned ${authResponse.status}`);
      }

      const authData = await authResponse.json();
      
      // Handle different response formats
      if (authData.message && authData.message.includes('Invalid or expired')) {
        throw new Error('Token is invalid or expired');
      }
      
      if (!authData || (!authData.id && !authData.student_id && !authData.user_id)) {
        throw new Error('Invalid token or student not found');
      }

      // Extract student ID from various possible fields
      const studentId = authData.id || authData.student_id || authData.user_id;
      
      // Extract student metadata from the response
      studentMetadata = {
        student_id: studentId,
        student_name: authData.name || authData.student_name || authData.full_name || 'Student',
        profile_id: studentId,
        attendance_id: studentId,
        assignments_id: studentId,
        exam_id: studentId,
        enrollment_id: studentId,
        exam_ids: authData.exam_ids || ['17'] // Use provided exam IDs or default
      };
        } catch (error) {
            console.error('Token verification failed:', error);
            return res.status(401).json({
                success: false,
                message: 'Token verification failed',
                error: error.message
            });
        }

        // Extract student_id from the metadata
        const student_id = studentMetadata.student_id || studentMetadata.id || studentMetadata.user_id;

        if (!student_id) {
            return res.status(400).json({
                success: false,
                message: 'Student ID not found in token metadata'
            });
        }

        // Find or create student in our database
        let student = await Student.findOne({ student_id });

        if (!student) {
            // Create new student with metadata from token
            student = new Student({
                student_id,
                student_name: studentMetadata.student_name || studentMetadata.name || studentMetadata.full_name || 'Student',
                history: []
            });
            await student.save();
        } else {
            // Update student name if it has changed
            const newName = studentMetadata.student_name || studentMetadata.name || studentMetadata.full_name;
            if (newName && student.student_name !== newName) {
                student.student_name = newName;
                await student.save();
            }
        }

        // Sync external data for this student
        try {
            await syncExternalData(student_id, studentMetadata);
        } catch (syncError) {
            console.warn('External data sync failed:', syncError.message);
            // Don't fail the authentication if sync fails
        }

        return res.status(200).json({
            success: true,
            message: 'Token verified successfully',
            student: {
                student_id: student.student_id,
                student_name: student.student_name,
                history: student.getHistorySummary()
            },
            metadata: studentMetadata
        });

    } catch (error) {
        console.error('Token authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during token authentication',
            error: error.message
        });
    }
});

// Helper function to sync external data
async function syncExternalData(student_id, studentMetadata) {
    try {
        // Extract IDs from metadata or use defaults
        const profileId = studentMetadata.profile_id || studentMetadata.id || '2';
        const attendanceStudentId = studentMetadata.attendance_id || student_id;
        const assignmentsStudentId = studentMetadata.assignments_id || student_id;
        const examStudentId = studentMetadata.exam_id || student_id;
        const enrollmentStudentId = studentMetadata.enrollment_id || student_id;
        const examIds = studentMetadata.exam_ids || ['17'];

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
            'X-API-TOKEN': 'RvpA6SuRQyydHIeZkyxbYViBmj5jVkODaTvZc24dbjE9XoKpxSM3KQy15zowmF0xaMkHcriCbt4abuMtvms54wtmWoXxESGxcvLeKvIM9ZFLblzzogMds9E8z3toxCYlE9kws9hqOAFbQo0wjHLESaX2FHcufLMlXhjx',
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

        return { success: true, student_id, snapshotUpdatedAt: doc.updatedAt };
    } catch (error) {
        console.error('External data sync error:', error);
        throw error;
    }
}

export default router;

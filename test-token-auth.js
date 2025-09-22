// Test script for token authentication
import fetch from 'node-fetch';

// Test the token authentication API
async function testTokenAuth() {
    const testToken = 'd885697702943421a7c6185632105613e0016f86a8655b8ae9d8ceeca30c3e39';
    const apiToken = 'RvpA6SuRQyydHIeZkyxbYViBmj5jVkODaTvZc24dbjE9XoKpxSM3KQy15zowmF0xaMkHcriCbt4abuMtvms54wtmWoXxESGxcvLeKvIM9ZFLblzzogMds9E8z3toxCYlE9kws9hqOAFbQo0wjHLESaX2FHcufLMlXhjx';

    console.log('Testing token authentication...');
    console.log('Token:', testToken);
    console.log('API URL:', `https://alnada.eprime.app/api/verify-token/${testToken}`);

    try {
        const response = await fetch(`https://alnada.eprime.app/api/verify-token/${testToken}`, {
            method: 'GET',
            headers: {
                'X-API-TOKEN': apiToken,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response Status:', response.status);
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
            const data = await response.json();
            console.log('Response Data:', JSON.stringify(data, null, 2));

            if (data.id) {
                console.log('\n✅ Token authentication successful!');
                console.log('Student ID:', data.id);
                console.log('Student Name:', data.name || data.student_name || 'N/A');

                // Test fetching student data with the extracted ID
                await testStudentDataFetching(data.id);
            } else {
                console.log('❌ No student ID found in response');
            }
        } else {
            const errorText = await response.text();
            console.log('❌ Authentication failed:', errorText);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Test fetching student data with the extracted ID
async function testStudentDataFetching(studentId) {
    console.log(`\nTesting student data fetching for ID: ${studentId}`);
    const apiToken = 'RvpA6SuRQyydHIeZkyxbYViBmj5jVkODaTvZc24dbjE9XoKpxSM3KQy15zowmF0xaMkHcriCbt4abuMtvms54wtmWoXxESGxcvLeKvIM9ZFLblzzogMds9E8z3toxCYlE9kws9hqOAFbQo0wjHLESaX2FHcufLMlXhjx';

    const endpoints = {
        profile: `https://alnada.eprime.app/api/students/${studentId}`,
        attendanceSummaryMonthly: `https://alnada.eprime.app/api/student/attendance/summary/monthly/${studentId}`,
        attendanceDetails: `https://alnada.eprime.app/api/student/attendance/details/${studentId}`,
        assignments: `https://alnada.eprime.app/api/student/assignments/${studentId}`,
        examList: `https://alnada.eprime.app/api/student/ExamList/${studentId}`,
        enrollment: `https://alnada.eprime.app/api/students/enrollment/${studentId}`,
    };

    const safeJson = async (url, name) => {
        try {
            const r = await fetch(url, {
                timeout: 10000,
                headers: {
                    'X-API-TOKEN': apiToken,
                    'Content-Type': 'application/json'
                }
            });
            if (!r.ok) {
                console.log(`❌ ${name}: HTTP ${r.status}`);
                return { error: true, status: r.status };
            }
            const data = await r.json();
            console.log(`✅ ${name}: Success (${JSON.stringify(data).length} chars)`);
            return data;
        } catch (e) {
            console.log(`❌ ${name}: ${e.message}`);
            return { error: true, message: e.message };
        }
    };

    // Test each endpoint
    for (const [name, url] of Object.entries(endpoints)) {
        await safeJson(url, name);
    }

    // Test exam data
    const examDataUrl = `https://alnada.eprime.app/api/student/ExamData/${studentId}/17`;
    await safeJson(examDataUrl, 'examData');
}

// Run the test
testTokenAuth().catch(console.error);

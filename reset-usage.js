// Script to reset usage for a student
import fetch from 'node-fetch';

const STUDENT_ID = '45'; // Change this to the student ID you want to reset
const API_BASE = 'http://localhost:5000/api';

async function resetUsage() {
    try {
        console.log(`Resetting usage for student ID: ${STUDENT_ID}`);

        const response = await fetch(`${API_BASE}/students/${STUDENT_ID}/reset-usage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Usage reset successfully!');
            console.log('Usage status:', data.usage);
        } else {
            const error = await response.text();
            console.log('❌ Failed to reset usage:', error);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

resetUsage();


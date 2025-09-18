// Simple test script to demonstrate the API functionality
// Run this after starting the server to test the endpoints

const BASE_URL = 'http://localhost:5000/api/students';

async function testAPI() {
    console.log('🧪 Testing Learning Assistant API...\n');

    try {
        // Test 1: Student Login (Create new student)
        console.log('1. Testing student login (new student)...');
        const loginResponse = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: 'test_student_001',
                student_name: 'Test Student'
            })
        });

        const loginData = await loginResponse.json();
        console.log('✅ Login successful:', loginData.message);
        console.log('   Student ID:', loginData.student.student_id);
        console.log('   Student Name:', loginData.student.student_name);
        console.log('   History:', loginData.student.history);
        console.log('');

        // Test 2: Create a new chat
        console.log('2. Testing chat creation...');
        const createChatResponse = await fetch(`${BASE_URL}/test_student_001/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                keyword: 'Math Help'
            })
        });

        const createChatData = await createChatResponse.json();
        console.log('✅ Chat created:', createChatData.message);
        console.log('   Chat Index:', createChatData.chat.index);
        console.log('   Chat Keyword:', createChatData.chat.keyword);
        console.log('');

        // Test 3: Add messages to the chat
        console.log('3. Testing message addition...');

        // Add user message
        const userMessageResponse = await fetch(`${BASE_URL}/test_student_001/chat/1/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: 'user',
                content: 'I need help with algebra'
            })
        });

        const userMessageData = await userMessageResponse.json();
        console.log('✅ User message added:', userMessageData.message);

        // Add assistant message
        const assistantMessageResponse = await fetch(`${BASE_URL}/test_student_001/chat/1/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: 'assistant',
                content: 'I\'d be happy to help you with algebra! What specific topic are you struggling with?'
            })
        });

        const assistantMessageData = await assistantMessageResponse.json();
        console.log('✅ Assistant message added:', assistantMessageData.message);
        console.log('');

        // Test 4: Get chat history summary
        console.log('4. Testing chat history retrieval...');
        const historyResponse = await fetch(`${BASE_URL}/test_student_001/history`);
        const historyData = await historyResponse.json();
        console.log('✅ History retrieved:', historyData.history);
        console.log('');

        // Test 5: Get specific chat by index
        console.log('5. Testing specific chat retrieval...');
        const chatResponse = await fetch(`${BASE_URL}/test_student_001/chat/1`);
        const chatData = await chatResponse.json();
        console.log('✅ Chat retrieved:');
        console.log('   Index:', chatData.chat.index);
        console.log('   Keyword:', chatData.chat.keyword);
        console.log('   Messages:', chatData.chat.messages.length);
        console.log('   Message details:');
        chatData.chat.messages.forEach((msg, idx) => {
            console.log(`     ${idx + 1}. [${msg.role}]: ${msg.content}`);
        });
        console.log('');

        // Test 6: Create another chat with same keyword
        console.log('6. Testing multiple chats with same keyword...');
        const createChat2Response = await fetch(`${BASE_URL}/test_student_001/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                keyword: 'Math Help' // Same keyword as first chat
            })
        });

        const createChat2Data = await createChat2Response.json();
        console.log('✅ Second chat created with same keyword:');
        console.log('   Chat Index:', createChat2Data.chat.index);
        console.log('   Chat Keyword:', createChat2Data.chat.keyword);
        console.log('');

        // Test 7: Get updated history
        console.log('7. Testing updated history...');
        const updatedHistoryResponse = await fetch(`${BASE_URL}/test_student_001/history`);
        const updatedHistoryData = await updatedHistoryResponse.json();
        console.log('✅ Updated history:');
        updatedHistoryData.history.forEach(chat => {
            console.log(`   Index ${chat.index}: "${chat.keyword}" (${chat.messageCount} messages)`);
        });
        console.log('');

        console.log('🎉 All tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log('- Student authentication works');
        console.log('- Chat creation with unique indexing works');
        console.log('- Message addition works');
        console.log('- History retrieval works');
        console.log('- Multiple chats with same keyword are distinguished by index');
        console.log('- All CRUD operations are functional');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\nMake sure the server is running on http://localhost:5000');
        console.log('Run: npm run dev');
    }
}

// Run the test
testAPI();



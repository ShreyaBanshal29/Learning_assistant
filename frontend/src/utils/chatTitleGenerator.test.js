// Test file to demonstrate chat title generation
import { generateChatTitle } from './chatTitleGenerator';

// Test cases
const testCases = [
    {
        input: "Explain Newton's second law in detail",
        expected: "Newton's Second Law"
    },
    {
        input: "What is machine learning and its applications?",
        expected: "Machine Learning Applications"
    },
    {
        input: "Steps to deploy a Flask app on Heroku",
        expected: "Flask App Deployment"
    },
    {
        input: "How do I create a React component?",
        expected: "React Component"
    },
    {
        input: "I want to learn Python programming",
        expected: "Python Programming"
    },
    {
        input: "Can you help me with JavaScript async/await?",
        expected: "JavaScript Async/Await"
    },
    {
        input: "What are the best practices for database design?",
        expected: "Database Design"
    },
    {
        input: "Tell me about machine learning algorithms",
        expected: "Machine Learning Algorithms"
    },
    {
        input: "How to implement authentication in Node.js?",
        expected: "Node.js Authentication"
    },
    {
        input: "I need help with CSS flexbox",
        expected: "CSS Flexbox"
    }
];

// Run tests
console.log('🧪 Testing Chat Title Generator...\n');

testCases.forEach((testCase, index) => {
    const result = generateChatTitle(testCase.input);
    const passed = result === testCase.expected;

    console.log(`Test ${index + 1}: ${passed ? '✅' : '❌'}`);
    console.log(`Input: "${testCase.input}"`);
    console.log(`Expected: "${testCase.expected}"`);
    console.log(`Got: "${result}"`);
    console.log('---');
});

// Additional test cases
console.log('\n🔍 Additional Test Cases:\n');

const additionalTests = [
    "Please explain quantum computing",
    "I want to understand blockchain technology",
    "Help me with Docker containerization",
    "What is the difference between SQL and NoSQL?",
    "How to build a REST API?",
    "Tell me about microservices architecture",
    "I need to learn about data structures",
    "Can you explain object-oriented programming?",
    "What are the steps to optimize website performance?",
    "How do I implement user authentication?"
];

additionalTests.forEach((input, index) => {
    const result = generateChatTitle(input);
    console.log(`${index + 1}. "${input}" → "${result}"`);
});

export default testCases;



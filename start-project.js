const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Learning Assistant Project...\n');

// Start backend server
console.log('📡 Starting backend server...');
const backend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'pipe',
    shell: true
});

backend.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
});

backend.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data.toString().trim()}`);
});

// Start frontend server after a short delay
setTimeout(() => {
    console.log('\n🎨 Starting frontend server...');
    const frontend = spawn('npm', ['start'], {
        cwd: path.join(__dirname, 'frontend'),
        stdio: 'pipe',
        shell: true
    });

    frontend.stdout.on('data', (data) => {
        console.log(`[Frontend] ${data.toString().trim()}`);
    });

    frontend.stderr.on('data', (data) => {
        console.error(`[Frontend Error] ${data.toString().trim()}`);
    });

    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down servers...');
        backend.kill();
        frontend.kill();
        process.exit(0);
    });

}, 2000);

// Handle backend process termination
backend.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
});

console.log('\n✅ Both servers are starting up...');
console.log('📝 Make sure you have:');
console.log('   1. MongoDB running locally or MongoDB Atlas connection');
console.log('   2. Created a .env file in backend/ with MONGO_URI');
console.log('   3. Installed dependencies in both frontend/ and backend/');
console.log('\n🌐 Frontend will be available at: http://localhost:3000');
console.log('🔧 Backend API will be available at: http://localhost:5000');
console.log('\nPress Ctrl+C to stop both servers');



# Learning Assistant Backend - Chat History Management

This backend provides MongoDB-based chat history management for students in the learning assistant application.

## Features

- Student authentication and management
- Chat history storage with unique indexing
- Message management within chats
- Chat keyword management
- Full CRUD operations for chats and messages

## Database Schema

### Student Model
- `student_id` (String, unique): Unique identifier for each student
- `student_name` (String): Display name of the student
- `history` (Array): Collection of chat objects
- `createdAt` (Date): When the student record was created
- `updatedAt` (Date): When the student record was last updated

### Chat Object Structure
- `index` (Number): Unique identifier within the student's history
- `keyword` (String): Short descriptive label for the chat
- `messages` (Array): Full conversation in chronological order
- `createdAt` (Date): When the chat was created
- `updatedAt` (Date): When the chat was last updated

### Message Object Structure
- `role` (String): Either "user" or "assistant"
- `content` (String): The message content
- `timestamp` (Date): When the message was sent

## API Endpoints

### Student Authentication
- `POST /api/students/login` - Login or create a new student
  - Body: `{ "student_id": "string", "student_name": "string" }`
  - Returns: Student info with chat history summary

### Chat History Management
- `GET /api/students/:student_id/history` - Get student's chat history summary
- `GET /api/students/:student_id/chat/:index` - Get specific chat by index
- `POST /api/students/:student_id/chat` - Create a new chat
  - Body: `{ "keyword": "string" }`
- `PUT /api/students/:student_id/chat/:index/keyword` - Update chat keyword
  - Body: `{ "keyword": "string" }`
- `DELETE /api/students/:student_id/chat/:index` - Delete a chat

### Message Management
- `POST /api/students/:student_id/chat/:index/message` - Add message to chat
  - Body: `{ "role": "user|assistant", "content": "string" }`

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the backend directory with:
   ```
   MONGO_URI=mongodb://localhost:27017/learning_assistant
   PORT=5000
   ```

3. Make sure MongoDB is running locally, or use MongoDB Atlas with a connection string like:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/learning_assistant?retryWrites=true&w=majority
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

## Usage Examples

### Student Login
```javascript
const response = await fetch('/api/students/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    student_id: 'student123',
    student_name: 'John Doe'
  })
});
```

### Get Chat History
```javascript
const response = await fetch('/api/students/student123/history');
const { history } = await response.json();
// Returns array of { index, keyword, messageCount, lastUpdated }
```

### Get Specific Chat
```javascript
const response = await fetch('/api/students/student123/chat/1');
const { chat } = await response.json();
// Returns full chat with messages array
```

### Add Message to Chat
```javascript
const response = await fetch('/api/students/student123/chat/1/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    role: 'user',
    content: 'Hello, I need help with math'
  })
});
```

## Key Features

- **Unique Chat Indexing**: Each chat gets a unique index within a student's history
- **Keyword Management**: Chats can have descriptive keywords for easy identification
- **Message Chronology**: Messages are stored in chronological order with timestamps
- **Automatic Indexing**: New chats automatically get the next available index
- **History Summary**: Quick access to chat metadata without loading full conversations
- **Flexible Keywords**: Multiple chats can have the same keyword but are distinguished by index

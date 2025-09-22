# Token Authentication Setup Guide

This guide explains how to configure your Learning Assistant project to work with the main website's token-based authentication system.

## Overview

The project now supports two authentication modes:
1. **Traditional Login**: Manual login with student ID and name (existing functionality)
2. **Token Authentication**: Automatic authentication using JWT tokens from the main website

## Configuration

### Backend Configuration

1. **Environment Variables**: Add these to your `.env` file:

```env
# Main website authentication API endpoint
MAIN_WEBSITE_AUTH_API=https://your-main-website.com/api/verify-token

# External API token for student data
EXTERNAL_API_TOKEN=your_external_api_token_here
```

2. **Main Website API**: Update the `MAIN_WEBSITE_AUTH_API` URL to point to your main website's token verification endpoint.

### Frontend Configuration

The frontend automatically detects token authentication mode when a `usertoken` parameter is present in the URL.

## How It Works

### Token Authentication Flow

1. **URL with Token**: User accesses the app via URL like:
   ```
   http://localhost:3000/?usertoken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Token Verification**: The app automatically:
   - Extracts the token from the URL
   - Calls your main website's authentication API
   - Verifies the token and gets student metadata

3. **Student Data Sync**: The system:
   - Creates or updates the student record in the database
   - Syncs external student data (profile, attendance, assignments, etc.)
   - Removes the token from the URL for security

4. **Session Management**: The student is logged in and can use the app normally

### Main Website API Requirements

Your main website's token verification API should:

**Endpoint**: `POST /api/verify-token`

**Request Body**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Format**:
```json
{
  "success": true,
  "student": {
    "student_id": "12345",
    "student_name": "John Doe",
    "profile_id": "2",
    "attendance_id": "12345",
    "assignments_id": "12345",
    "exam_id": "12345",
    "enrollment_id": "12345",
    "exam_ids": ["17"]
  }
}
```

## API Endpoints

### New Authentication Endpoint

- **POST** `/api/auth/verify-token`
  - Verifies JWT token with main website
  - Creates/updates student record
  - Syncs external student data
  - Returns student information

### Existing Endpoints (Unchanged)

All existing student and AI endpoints remain the same and work with both authentication modes.

## Testing

### Test Token Authentication

1. Start your backend server
2. Access the frontend with a token:
   ```
   http://localhost:3000/?usertoken=test_token_123
   ```
3. The app should automatically authenticate and show the main interface

### Test Traditional Login

1. Access the frontend without a token:
   ```
   http://localhost:3000/
   ```
2. The traditional login form should appear

## Security Considerations

1. **Token Removal**: Tokens are automatically removed from the URL after authentication
2. **Token Validation**: All tokens are verified with the main website before use
3. **Session Management**: Student sessions are managed the same way as traditional login
4. **Data Sync**: External student data is synced securely using API tokens

## Troubleshooting

### Common Issues

1. **Token Verification Fails**:
   - Check `MAIN_WEBSITE_AUTH_API` URL is correct
   - Verify the main website API is accessible
   - Check token format and validity

2. **External Data Sync Fails**:
   - Verify `EXTERNAL_API_TOKEN` is set correctly
   - Check external API endpoints are accessible
   - Review network connectivity

3. **Student Not Found**:
   - Ensure the main website API returns valid student metadata
   - Check that `student_id` is present in the response

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will show detailed error messages in the console.

## Migration Notes

- **Backward Compatibility**: Traditional login still works
- **No Data Loss**: Existing student data is preserved
- **Gradual Rollout**: You can deploy this alongside the existing system
- **Fallback**: If token authentication fails, users can still use traditional login


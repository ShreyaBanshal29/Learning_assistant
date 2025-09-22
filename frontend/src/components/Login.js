import React, { useState } from 'react';
import { useStudent } from '../context/StudentContext';
import { isTokenAuthMode } from '../utils/tokenUtils';

const Login = () => {
    const [studentId, setStudentId] = useState('');
    const [studentName, setStudentName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { login, loading } = useStudent();
    const isTokenMode = isTokenAuthMode();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!studentId.trim() || !studentName.trim()) {
            setError('Please enter both Student ID and Name');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await login(studentId.trim(), studentName.trim());
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Show loading state for token authentication
    if (isTokenMode && loading) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <h2>Welcome to Learning Assistant</h2>
                        <p>Authenticating...</p>
                    </div>
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state for token authentication
    if (isTokenMode && error) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <h2>Welcome to Learning Assistant</h2>
                        <p>Authentication Error</p>
                    </div>
                    <div className="error-message">
                        {error}
                    </div>
                    <div className="login-footer">
                        <p>Please contact support if this issue persists.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show traditional login form for non-token mode
    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h2>Welcome to Learning Assistant</h2>
                    <p>Enter your credentials</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="studentId">Student ID</label>
                        <input
                            type="text"
                            id="studentId"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            placeholder="Enter your student ID"
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="studentName">Full Name</label>
                        <input
                            type="text"
                            id="studentName"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            placeholder="Enter your full name"
                            disabled={isLoading}
                            required
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>New students will be automatically registered</p>
                </div>
            </div>
        </div>
    );
};

export default Login;



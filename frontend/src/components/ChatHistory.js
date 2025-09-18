import React, { useState } from 'react';
import { useStudent } from '../context/StudentContext';

const ChatHistory = ({ isOpen, onClose }) => {
    const {
        chatHistory,
        currentChat,
        loadChat,
        deleteChat,
        updateChatKeyword,
        loading
    } = useStudent();

    const [editingChat, setEditingChat] = useState(null);
    const [newKeyword, setNewKeyword] = useState('');

    const handleChatClick = async (chat) => {
        try {
            await loadChat(chat.index);
            onClose();
        } catch (error) {
            console.error('Failed to load chat:', error);
        }
    };

    const handleDeleteChat = async (e, chatIndex) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this chat?')) {
            try {
                await deleteChat(chatIndex);
            } catch (error) {
                console.error('Failed to delete chat:', error);
            }
        }
    };

    const handleEditKeyword = (e, chat) => {
        e.stopPropagation();
        setEditingChat(chat.index);
        setNewKeyword(chat.keyword);
    };

    const handleSaveKeyword = async (e) => {
        e.preventDefault();
        if (!newKeyword.trim()) return;

        try {
            await updateChatKeyword(editingChat, newKeyword.trim());
            setEditingChat(null);
            setNewKeyword('');
        } catch (error) {
            console.error('Failed to update keyword:', error);
        }
    };

    const handleCancelEdit = () => {
        setEditingChat(null);
        setNewKeyword('');
    };

    

    if (!isOpen) return null;

    return (
        <div className="history-overlay" onClick={onClose}>
            <div className="panel history-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="panel-title">
                    Chat History
                    {loading && <span className="loading-indicator">Loading...</span>}
                </div>

                {chatHistory.length === 0 ? (
                    <div className="empty-history">
                        <p>No chat history found</p>
                        <p>Start a new conversation to see it here!</p>
                    </div>
                ) : (
                    <ul className="list">
                        {chatHistory.map((chat) => (
                            <li
                                key={chat.index}
                                className={`history-item ${currentChat?.index === chat.index ? 'active' : ''}`}
                                onClick={() => handleChatClick(chat)}
                            >
                                <div className="chat-info">
                                    {editingChat === chat.index ? (
                                        <form onSubmit={handleSaveKeyword} className="edit-form">
                                            <input
                                                type="text"
                                                value={newKeyword}
                                                onChange={(e) => setNewKeyword(e.target.value)}
                                                className="edit-input"
                                                autoFocus
                                                onBlur={handleCancelEdit}
                                            />
                                        </form>
                                    ) : (
                                        <div className="chat-title">{chat.keyword}</div>
                                    )}

                                </div>

                                <div className="chat-actions">
                                    <button
                                        className="edit-button"
                                        onClick={(e) => handleEditKeyword(e, chat)}
                                        title="Edit keyword"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="delete-button"
                                        onClick={(e) => handleDeleteChat(e, chat.index)}
                                        title="Delete chat"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ChatHistory;

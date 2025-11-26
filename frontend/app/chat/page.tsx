'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';

interface Message {
  message_id: number;
  sender_id: number;
  recipient_id: number;
  content: string;
  sender_name: string;
  recipient_name: string;
  timestamp: string;
}

interface User {
  user_id: number;
  full_name: string;
  role_name: string;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const socket = useSocket();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    searchParams.get('user_id') ? parseInt(searchParams.get('user_id')!) : null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages();
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (socket && selectedUserId) {
      socket.on('new_message', (message: Message) => {
        if (
          (message.sender_id === selectedUserId && message.recipient_id === user?.user_id) ||
          (message.recipient_id === selectedUserId && message.sender_id === user?.user_id)
        ) {
          setMessages((prev) => [...prev, message]);
          scrollToBottom();
        }
      });

      return () => {
        socket.off('new_message');
      };
    }
  }, [socket, selectedUserId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchUsers = async () => {
    try {
      // Get all users first (this should always work)
      const allUsersResponse = await api.get('/api/messages/users');
      const allUsers = allUsersResponse.data || [];
      
      // Try to get conversations (optional - if it fails, just show all users)
      let conversationUsers: any[] = [];
      try {
        const conversationsResponse = await api.get('/api/messages/conversations');
        conversationUsers = conversationsResponse.data || [];
      } catch (conversationError) {
        console.log('No conversations yet or endpoint not available:', conversationError);
        // This is fine - just show all users
      }

      // Combine: users with conversations first, then other users
      const conversationUserIds = new Set(conversationUsers.map((u: any) => u.user_id));
      const otherUsers = allUsers.filter((u: User) => 
        u.user_id !== user?.user_id && !conversationUserIds.has(u.user_id)
      );

      // Map conversation users to match User interface
      const mappedConversationUsers = conversationUsers.map((c: any) => ({
        user_id: c.user_id,
        full_name: c.full_name,
        role_name: c.role_name
      }));

      // If we have conversation users, show them first, otherwise just show all users
      if (mappedConversationUsers.length > 0) {
        setUsers([...mappedConversationUsers, ...otherUsers]);
      } else {
        setUsers(allUsers.filter((u: User) => u.user_id !== user?.user_id));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedUserId) return;

    try {
      const response = await api.get(`/api/messages?recipient_id=${selectedUserId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;

    try {
      const response = await api.post('/api/messages', {
        recipient_id: selectedUserId,
        content: newMessage,
      });
      setMessages((prev) => [...prev, response.data]);
      setNewMessage('');
      scrollToBottom();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error sending message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const selectedUser = users.find((u) => u.user_id === selectedUserId);

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">Loading chat...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          {/* Page Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Internal Chat
              </h1>
              <p className="text-gray-500 mt-1">Communicate with team members</p>
            </div>
          </div>

          {/* Chat Container */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[650px]">
            {/* Users Sidebar */}
            <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Team Members
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <ul className="space-y-2">
                  {users.map((u) => (
                    <li
                      key={u.user_id}
                      onClick={() => setSelectedUserId(u.user_id)}
                      className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedUserId === u.user_id 
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]' 
                          : 'hover:bg-gray-50 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                          selectedUserId === u.user_id 
                            ? 'bg-white/20 text-white' 
                            : 'bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700'
                        }`}>
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate ${selectedUserId === u.user_id ? 'text-white' : 'text-gray-900'}`}>
                            {u.full_name}
                          </div>
                          <div className={`text-xs truncate ${selectedUserId === u.user_id ? 'text-indigo-200' : 'text-gray-500'}`}>
                            {u.role_name}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3 bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 flex flex-col overflow-hidden">
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg shadow-indigo-500/30">
                        {selectedUser.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">{selectedUser.full_name}</h2>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          {selectedUser.role_name}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.message_id}
                          className={`flex ${
                            message.sender_id === user?.user_id ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                              message.sender_id === user?.user_id
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                                : 'bg-white text-gray-900 border border-gray-100 rounded-bl-md'
                            }`}
                          >
                            <div className="text-sm leading-relaxed">{message.content}</div>
                            <div
                              className={`text-xs mt-2 flex items-center gap-1 ${
                                message.sender_id === user?.user_id
                                  ? 'text-indigo-200'
                                  : 'text-gray-400'
                              }`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {new Date(message.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-100 bg-white">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        className="flex-1 bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder-gray-400"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            sendMessage();
                          }
                        }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center gap-2"
                      >
                        <span>Send</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gradient-to-b from-gray-50/50 to-white">
                  <div className="p-6 bg-gray-100 rounded-full mb-4">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-gray-500">Select a user to start chatting</p>
                  <p className="text-sm text-gray-400 mt-1">Choose from the list on the left</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}


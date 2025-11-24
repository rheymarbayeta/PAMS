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
          <div>Loading...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Internal Chat</h1>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
            <div className="bg-white shadow rounded-lg p-4 overflow-y-auto">
              <h2 className="font-bold mb-4">Users</h2>
              <ul className="space-y-2">
                {users.map((u) => (
                  <li
                    key={u.user_id}
                    onClick={() => setSelectedUserId(u.user_id)}
                    className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                      selectedUserId === u.user_id ? 'bg-indigo-100' : ''
                    }`}
                  >
                    <div className="font-medium">{u.full_name}</div>
                    <div className="text-xs text-gray-500">{u.role_name}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-3 bg-white shadow rounded-lg flex flex-col">
              {selectedUser ? (
                <>
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="font-bold">{selectedUser.full_name}</h2>
                    <div className="text-sm text-gray-500">{selectedUser.role_name}</div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.message_id}
                        className={`flex ${
                          message.sender_id === user?.user_id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender_id === user?.user_id
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <div className="text-sm">{message.content}</div>
                          <div
                            className={`text-xs mt-1 ${
                              message.sender_id === user?.user_id
                                ? 'text-indigo-200'
                                : 'text-gray-500'
                            }`}
                          >
                            {new Date(message.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Type a message..."
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
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select a user to start chatting
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';

interface User {
  user_id: number;
  username: string;
  full_name: string;
  role_id: number;
  role_name: string;
}

interface Role {
  role_id: number;
  role_name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role_id: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get('/api/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/api/users/${editingUser.user_id}`, formData);
      } else {
        await api.post('/api/users', formData);
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ username: '', password: '', full_name: '', role_id: '' });
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error saving user');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      full_name: user.full_name,
      role_id: user.role_id.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/api/users/${userId}`);
      alert('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error deleting user';
      alert(errorMessage);
      console.error('Delete user error:', error.response?.data);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-slate-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-slate-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-slate-600 font-medium">Loading users...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
      <Layout>
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                  User Management
                </h1>
                <p className="text-sm text-slate-500">{users.length} users registered</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingUser(null);
                setFormData({ username: '', password: '', full_name: '', role_id: '' });
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-700 focus:ring-4 focus:ring-slate-300 transition-all duration-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add User
            </button>
          </div>

          {/* Users List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {users.map((user, index) => (
                <li key={user.user_id} className="hover:bg-slate-50/80 transition-colors">
                  <div className="px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-lg font-semibold text-slate-600">
                          {user.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          {user.full_name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-slate-500">@{user.username}</span>
                          <span className="text-slate-300">•</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {user.role_name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 hover:text-white hover:bg-teal-600 rounded-md border border-teal-200 hover:border-teal-600 transition-all duration-200"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.user_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 rounded-md border border-red-200 hover:border-red-600 transition-all duration-200"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
              <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {editingUser ? 'Edit User' : 'Add New User'}
                    </h3>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Username
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                        placeholder="Enter username"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                      </label>
                      <input
                        type="password"
                        required={!editingUser}
                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                        placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                        placeholder="Enter full name"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData({ ...formData, full_name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Role
                      </label>
                      <select
                        required
                        title="Select user role"
                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none cursor-pointer"
                        value={formData.role_id}
                        onChange={(e) =>
                          setFormData({ ...formData, role_id: e.target.value })
                        }
                      >
                        <option value="">Select a role</option>
                        {roles.map((role) => (
                          <option key={role.role_id} value={role.role_id}>
                            {role.role_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setEditingUser(null);
                        }}
                        className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 focus:ring-4 focus:ring-slate-300 transition-all duration-200"
                      >
                        {editingUser ? 'Update User' : 'Create User'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}


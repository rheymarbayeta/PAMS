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
          <div>Loading...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <button
              onClick={() => {
                setEditingUser(null);
                setFormData({ username: '', password: '', full_name: '', role_id: '' });
                setShowModal(true);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Add User
            </button>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li key={user.user_id}>
                  <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.username} • {user.role_name}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.user_id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-bold mb-4">
                  {editingUser ? 'Edit User' : 'Add User'}
                </h3>
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Role
                    </label>
                    <select
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
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
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingUser(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      {editingUser ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}


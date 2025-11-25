'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';

interface Entity {
  entity_id: number;
  entity_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [formData, setFormData] = useState({
    entity_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      const response = await api.get('/api/entities');
      setEntities(response.data);
    } catch (error) {
      console.error('Error fetching entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEntity) {
        await api.put(`/api/entities/${editingEntity.entity_id}`, formData);
      } else {
        await api.post('/api/entities', formData);
      }
      setShowModal(false);
      setEditingEntity(null);
      setFormData({ entity_name: '', contact_person: '', email: '', phone: '', address: '' });
      fetchEntities();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error saving entity');
    }
  };

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setFormData({
      entity_name: entity.entity_name,
      contact_person: entity.contact_person || '',
      email: entity.email || '',
      phone: entity.phone || '',
      address: entity.address || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (entityId: number) => {
    if (!confirm('Are you sure you want to delete this entity?')) return;
    try {
      await api.delete(`/api/entities/${entityId}`);
      fetchEntities();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting entity');
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
            <h1 className="text-3xl font-bold text-gray-900">Entity Management</h1>
            <button
              onClick={() => {
                setEditingEntity(null);
                setFormData({ entity_name: '', contact_person: '', email: '', phone: '', address: '' });
                setShowModal(true);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Add Entity
            </button>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {entities.map((entity) => (
                <li key={entity.entity_id}>
                  <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {entity.entity_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {entity.address && `${entity.address}`}
                        {entity.contact_person && ` • Contact: ${entity.contact_person}`}
                        {entity.email && ` • ${entity.email}`}
                        {entity.phone && ` • ${entity.phone}`}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(entity)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entity.entity_id)}
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
                  {editingEntity ? 'Edit Entity' : 'Add Entity'}
                </h3>
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Entity Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter entity name"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.entity_name}
                      onChange={(e) =>
                        setFormData({ ...formData, entity_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      placeholder="Enter contact person name"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.contact_person}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_person: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="Enter email address"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <textarea
                      placeholder="Enter address"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingEntity(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      {editingEntity ? 'Update' : 'Create'}
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


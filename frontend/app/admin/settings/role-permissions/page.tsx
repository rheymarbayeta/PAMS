'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert } from '@/utils/modal';

interface Permission {
  permission_id: string;
  permission_name: string;
  description: string;
  category: string;
}

interface RolePermission {
  role_id: string;
  role_name: string;
  permissions: string[];
  description: string;
}

const ROLE_PERMISSIONS_MAP: Record<string, { label: string; permissions: string[]; description: string }> = {
  'SuperAdmin': {
    label: 'Super Administrator',
    permissions: ['all'],
    description: 'Full access to all features',
  },
  'Admin': {
    label: 'Administrator',
    permissions: ['permits', 'applications', 'entities', 'citations', 'reports', 'users', 'settings', 'enforcers'],
    description: 'Full administrative access',
  },
  'Rights and Rentals Manager': {
    label: 'Rights and Rentals Manager',
    permissions: ['rights_rentals_view', 'rights_rentals_record_payment', 'rights_rentals_view_reports'],
    description: 'Manage lease contracts, payments for rights and rentals',
  },
  'Assessor': {
    label: 'Assessor',
    permissions: ['applications', 'assess_fees', 'view_reports'],
    description: 'Assess and calculate fees for applications',
  },
  'Approver': {
    label: 'Approver',
    permissions: ['applications', 'approve_applications'],
    description: 'Approve applications after assessment',
  },
  'Traffic Officer': {
    label: 'Traffic Officer',
    permissions: ['citations', 'create_citations', 'view_citations'],
    description: 'Issue and manage citations',
  },
  'Citation Manager': {
    label: 'Citation Manager',
    permissions: ['citations', 'create_citations', 'view_citations', 'delete_citations'],
    description: 'Full citation management including deletion',
  },
  'Waterworks Manager': {
    label: 'Waterworks Manager',
    permissions: ['waterworks_view', 'waterworks_manage', 'waterworks_billing', 'waterworks_payments', 'waterworks_reports'],
    description: 'Manage water supplies, accounts, billing, and payments',
  },
  'Meter Reader': {
    label: 'Meter Reader',
    permissions: ['waterworks_mobile_read'],
    description: 'Submit meter readings via mobile app for assigned supplies',
  },
  'Application Creator': {
    label: 'Application Creator',
    permissions: ['applications', 'create_applications'],
    description: 'Create new permit applications',
  },
};

const AVAILABLE_PERMISSIONS: Permission[] = [
  { permission_id: 'dashboard_view', permission_name: 'View Dashboard', category: 'Dashboard', description: 'Access main dashboard' },
  { permission_id: 'applications', permission_name: 'Manage Applications', category: 'Applications', description: 'View and manage permit applications' },
  { permission_id: 'assess_fees', permission_name: 'Assess Fees', category: 'Applications', description: 'Calculate and assess fees for applications' },
  { permission_id: 'approve_applications', permission_name: 'Approve Applications', category: 'Applications', description: 'Approve applications' },
  { permission_id: 'create_applications', permission_name: 'Create Applications', category: 'Applications', description: 'Create new applications' },
  { permission_id: 'entities', permission_name: 'Manage Entities', category: 'Entities', description: 'View and manage entities' },
  { permission_id: 'citations', permission_name: 'Manage Citations', category: 'Citations', description: 'View and manage citations' },
  { permission_id: 'create_citations', permission_name: 'Create Citations', category: 'Citations', description: 'Issue new citations' },
  { permission_id: 'view_citations', permission_name: 'View Citations', category: 'Citations', description: 'View citations' },
  { permission_id: 'delete_citations', permission_name: 'Delete Citations', category: 'Citations', description: 'Delete existing citations' },
  { permission_id: 'rights_rentals_view', permission_name: 'View Rights & Rentals', category: 'Rights & Rentals', description: 'View lease contracts and payment history' },
  { permission_id: 'rights_rentals_record_payment', permission_name: 'Record R&R Payments', category: 'Rights & Rentals', description: 'Record payments for rights and rentals' },
  { permission_id: 'rights_rentals_view_reports', permission_name: 'View R&R Reports', category: 'Rights & Rentals', description: 'View rights and rentals reports' },
  { permission_id: 'waterworks_view', permission_name: 'View Waterworks', category: 'Waterworks', description: 'View water supplies and consumer accounts' },
  { permission_id: 'waterworks_manage', permission_name: 'Manage Waterworks', category: 'Waterworks', description: 'Manage supplies, accounts, and verify readings' },
  { permission_id: 'waterworks_billing', permission_name: 'Waterworks Billing', category: 'Waterworks', description: 'Generate water billing statements' },
  { permission_id: 'waterworks_payments', permission_name: 'Record Water Payments', category: 'Waterworks', description: 'Record waterworks payments' },
  { permission_id: 'waterworks_reports', permission_name: 'Waterworks Reports', category: 'Waterworks', description: 'View waterworks collection reports' },
  { permission_id: 'waterworks_mobile_read', permission_name: 'Mobile Meter Reading', category: 'Waterworks', description: 'Submit meter readings from mobile app' },
  { permission_id: 'view_reports', permission_name: 'View Reports', category: 'Reports', description: 'View system reports' },
  { permission_id: 'users', permission_name: 'Manage Users', category: 'Admin', description: 'View and manage user accounts' },
  { permission_id: 'settings', permission_name: 'Manage Settings', category: 'Admin', description: 'Configure system settings' },
  { permission_id: 'enforcers', permission_name: 'Manage Enforcers', category: 'Admin', description: 'Manage enforcer staff' },
];

export default function RolePermissionsPage() {
  const { hasRole } = useAuth();
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/roles');
      const data: Array<{ role_id: string; role_name: string; permissions: string[] }> = response.data;

      // Merge with local label/description metadata
      const roleList: RolePermission[] = data.map((r) => {
        const meta = ROLE_PERMISSIONS_MAP[r.role_name] || ROLE_PERMISSIONS_MAP[r.role_id];
        return {
          role_id: r.role_id,
          role_name: meta?.label || r.role_name,
          permissions: r.permissions || meta?.permissions || [],
          description: meta?.description || '',
        };
      });
      setRoles(roleList);
    } catch (error) {
      console.error('Error loading roles:', error);
      showAlert('Error loading roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (role: RolePermission) => {
    setEditingRole(role.role_id);
    setSelectedPermissions(role.permissions);
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSavePermissions = async () => {
    try {
      setSaving(true);
      await api.put(`/api/roles/${editingRole}/permissions`, { permissions: selectedPermissions });
      setRoles(
        roles.map((role) =>
          role.role_id === editingRole
            ? { ...role, permissions: selectedPermissions }
            : role
        )
      );
      setEditingRole(null);
      showAlert('Role permissions updated successfully', 'success');
    } catch (error) {
      console.error('Error saving permissions:', error);
      showAlert('Error saving role permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingRole(null);
    setSelectedPermissions([]);
  };

  const getPermissionsByCategory = () => {
    const grouped: Record<string, Permission[]> = {};
    AVAILABLE_PERMISSIONS.forEach((perm) => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-center py-20">
              <div className="text-lg">Loading...</div>
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Role Permissions</h1>
            <p className="mt-2 text-slate-600">
              Configure permissions and access levels for user roles
            </p>
          </div>

          <div className="grid gap-6">
            {roles.map((role) => (
              <div
                key={role.role_id}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {role.role_name}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {role.description}
                      </p>
                    </div>
                    {editingRole !== role.role_id && (
                      <button
                        onClick={() => handleEditRole(role)}
                        className="px-4 py-2 text-sm font-medium text-teal-600 hover:text-white hover:bg-teal-600 rounded-lg border border-teal-200 hover:border-teal-600 transition-all duration-200"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4">
                  {editingRole === role.role_id ? (
                    <div className="space-y-6">
                      {Object.entries(getPermissionsByCategory()).map(([category, perms]) => (
                        <div key={category}>
                          <h4 className="text-sm font-semibold text-slate-900 mb-3">
                            {category}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {perms.map((perm) => (
                              <label
                                key={perm.permission_id}
                                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(perm.permission_id)}
                                  onChange={() => handlePermissionToggle(perm.permission_id)}
                                  className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 mt-0.5 cursor-pointer"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    {perm.permission_name}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {perm.description}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button
                          onClick={handleSavePermissions}
                          disabled={saving}
                          className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600 font-medium">
                        Current permissions ({role.permissions.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.length > 0 ? (
                          role.permissions.map((perm) => {
                            const permConfig = AVAILABLE_PERMISSIONS.find(
                              (p) => p.permission_id === perm
                            );
                            return (
                              <span
                                key={perm}
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200"
                              >
                                {permConfig?.permission_name || perm}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-sm text-slate-500">No permissions assigned</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              ℹ️ About Role Permissions
            </h3>
            <p className="text-sm text-blue-800">
              Permissions define what actions users with a specific role can perform. To modify role permissions,
              click the "Edit" button on any role card. Changes are applied immediately to all users with that role.
            </p>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

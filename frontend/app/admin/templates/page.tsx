'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import Link from 'next/link';

interface Template {
  template_id: string;
  template_name: string;
  file_name: string;
  file_size: number;
  permit_type_id: string | null;
  permit_type_name: string | null;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  created_by_name: string;
}

interface PermitType {
  permit_type_id: string;
  permit_type_name: string;
}

interface TemplateVariable {
  name: string;
  description: string;
}

interface TemplateVariables {
  [category: string]: TemplateVariable[];
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [permitTypes, setPermitTypes] = useState<PermitType[]>([]);
  const [templateVariables, setTemplateVariables] = useState<TemplateVariables>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    template_name: '',
    permit_type_id: '',
    description: '',
    is_default: false,
  });

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await api.get('/api/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, []);

  const fetchPermitTypes = useCallback(async () => {
    try {
      const response = await api.get('/api/permit-types');
      setPermitTypes(response.data);
    } catch (error) {
      console.error('Error fetching permit types:', error);
    }
  }, []);

  const fetchTemplateVariables = useCallback(async () => {
    try {
      const response = await api.get('/api/applications/template-variables');
      setTemplateVariables(response.data);
    } catch (error) {
      console.error('Error fetching template variables:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTemplates(), fetchPermitTypes(), fetchTemplateVariables()]);
      setLoading(false);
    };
    loadData();
  }, [fetchTemplates, fetchPermitTypes, fetchTemplateVariables]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
      ];
      if (!allowedTypes.includes(file.type) && !file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
        alert('Please select a Microsoft Word document (.docx or .doc)');
        return;
      }
      setSelectedFile(file);
      // Auto-fill template name from filename if empty
      if (!uploadForm.template_name) {
        const nameWithoutExt = file.name.replace(/\.(docx?|doc)$/i, '');
        setUploadForm(prev => ({ ...prev, template_name: nameWithoutExt }));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }
    if (!uploadForm.template_name.trim()) {
      alert('Please enter a template name');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('template', selectedFile);
      formData.append('template_name', uploadForm.template_name.trim());
      if (uploadForm.permit_type_id) {
        formData.append('permit_type_id', uploadForm.permit_type_id);
      }
      if (uploadForm.description) {
        formData.append('description', uploadForm.description);
      }
      formData.append('is_default', String(uploadForm.is_default));

      await api.post('/api/templates/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Template uploaded successfully');
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadForm({ template_name: '', permit_type_id: '', description: '', is_default: false });
      fetchTemplates();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error uploading template');
    } finally {
      setUploading(false);
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      await api.put(`/api/templates/${templateId}/set-default`);
      fetchTemplates();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error setting default template');
    }
  };

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete the template "${templateName}"?`)) {
      return;
    }

    try {
      await api.delete(`/api/templates/${templateId}`);
      fetchTemplates();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting template');
    }
  };

  const handleDownload = async (templateId: string, fileName: string) => {
    try {
      const response = await api.get(`/api/templates/${templateId}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert('Error downloading template');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading templates...</p>
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
          {/* Header */}
          <div className="mb-8">
            <nav className="flex items-center text-sm font-medium text-gray-500 mb-4">
              <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
              <svg className="mx-2 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-900">Report Templates</span>
            </nav>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Report Templates</h1>
                <p className="mt-2 text-gray-600">Manage Word document templates for permit reports</p>
              </div>
              <div className="mt-4 sm:mt-0 flex gap-3">
                <button
                  onClick={() => setShowVariablesModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Template Variables
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Template
                </button>
              </div>
            </div>
          </div>

          {/* Templates List */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by uploading a Word document template.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Upload Template
                  </button>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permit Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((template) => (
                    <tr key={template.template_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-lg">
                            <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{template.template_name}</div>
                            <div className="text-sm text-gray-500">{template.file_name} • {formatFileSize(template.file_size)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {template.permit_type_name ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {template.permit_type_name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">All permit types</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {template.is_default && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Default
                            </span>
                          )}
                          {template.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(template.created_at)}</div>
                        <div className="text-sm text-gray-500">by {template.created_by_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownload(template.template_id, template.file_name)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Download"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          {!template.is_default && (
                            <button
                              onClick={() => handleSetDefault(template.template_id)}
                              className="text-green-600 hover:text-green-900"
                              title="Set as Default"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(template.template_id, template.template_name)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Usage Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-3">How to use templates</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>1. Create a Word document (.docx) with your desired layout and formatting.</p>
              <p>2. Add placeholders using curly braces, e.g., <code className="bg-blue-100 px-1 py-0.5 rounded">{'{business_name}'}</code> or <code className="bg-blue-100 px-1 py-0.5 rounded">{'{permit_type}'}</code>.</p>
              <p>3. For tables with multiple rows (like fees), use loop syntax: <code className="bg-blue-100 px-1 py-0.5 rounded">{'{#fees}'}</code>...<code className="bg-blue-100 px-1 py-0.5 rounded">{'{/fees}'}</code>.</p>
              <p>4. Upload the template here and set it as default for the appropriate permit type.</p>
              <p>5. Generate documents from the application detail page using the "Generate Report" button.</p>
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-xl bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Template</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setUploadForm({ template_name: '', permit_type_id: '', description: '', is_default: false });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close upload modal"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template File</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-400 transition-colors">
                    <div className="space-y-1 text-center">
                      {selectedFile ? (
                        <div className="flex items-center justify-center">
                          <svg className="h-8 w-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z" />
                          </svg>
                          <span className="ml-2 text-sm text-gray-600">{selectedFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="text-sm text-gray-600">
                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                              <span>Upload a file</span>
                              <input
                                type="file"
                                className="sr-only"
                                accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                                onChange={handleFileChange}
                              />
                            </label>
                            <span className="pl-1">or drag and drop</span>
                          </div>
                          <p className="text-xs text-gray-500">Word documents (.docx, .doc) up to 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={uploadForm.template_name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, template_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Mayor's Permit Template"
                  />
                </div>

                {/* Permit Type */}
                <div>
                  <label htmlFor="permit_type_select" className="block text-sm font-medium text-gray-700 mb-1">Permit Type (Optional)</label>
                  <select
                    id="permit_type_select"
                    value={uploadForm.permit_type_id}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, permit_type_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All permit types</option>
                    {permitTypes.map((pt) => (
                      <option key={pt.permit_type_id} value={pt.permit_type_id}>
                        {pt.permit_type_name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Leave empty to use this template for all permit types</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Brief description of this template"
                  />
                </div>

                {/* Set as Default */}
                <div className="flex items-center">
                  <input
                    id="is_default"
                    type="checkbox"
                    checked={uploadForm.is_default}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, is_default: e.target.checked }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                    Set as default template for this permit type
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setUploadForm({ template_name: '', permit_type_id: '', description: '', is_default: false });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Template Variables Modal */}
        {showVariablesModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-xl bg-white max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Available Template Variables</h3>
                <button
                  onClick={() => setShowVariablesModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close template variables modal"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {Object.entries(templateVariables).map(([category, variables]) => (
                  <div key={category} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h4 className="font-medium text-gray-900 capitalize">{category.replace(/_/g, ' ')}</h4>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variable</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {variables.map((variable, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <code className="text-sm bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{variable.name}</code>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">{variable.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowVariablesModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}

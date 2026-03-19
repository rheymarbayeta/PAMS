'use client';

import { useState, useEffect, useRef } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/ext-language_tools';

interface Template {
  template_id: string;
  report_type: string;
  template_html: string;
  description?: string;
  version: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Variable {
  name: string;
  description: string;
}

export default function ReportTemplatesPage() {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'assessment' | 'permit' | 'endorsement'>('assessment');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [templateHtml, setTemplateHtml] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [variables, setVariables] = useState<{ [key: string]: Variable[] }>({});
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const editorRef = useRef<any>(null);

  // Check authorization
  if (!hasRole('Admin') && !hasRole('SuperAdmin')) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
            You do not have permission to access this page. Only Admins can manage report templates.
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  // Load templates and variables on mount
  useEffect(() => {
    loadTemplates();
    loadVariables();
    loadApplications();
  }, [activeTab]);

  async function loadTemplates() {
    try {
      setLoading(true);
      const response = await api.get(`/api/report-templates?reportType=${activeTab}`);
      setTemplates(response.data.templates || []);

      // Set current template to default if it exists
      const defaultTemplate = response.data.templates?.find((t: Template) => t.is_default);
      if (defaultTemplate) {
        setCurrentTemplate(defaultTemplate);
        setTemplateHtml(defaultTemplate.template_html);
        setTemplateDescription(defaultTemplate.description || '');
      }
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadVariables() {
    try {
      const response = await api.get(`/api/report-templates/${activeTab}/variables`);
      setVariables(response.data.variables || {});
    } catch (err) {
      console.error('Failed to load variables:', err);
    }
  }

  async function loadApplications() {
    try {
      const response = await api.get('/api/applications?limit=50');
      setApplications(response.data.applications || []);
      if (response.data.applications?.length > 0) {
        setSelectedAppId(response.data.applications[0].application_id);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
  }

  async function handlePreview() {
    if (!selectedAppId || !currentTemplate) {
      setError('Please select an application to preview');
      return;
    }

    try {
      setError('');
      const response = await api.post(`/api/report-templates/${currentTemplate.template_id}/preview`, {
        applicationId: selectedAppId
      });
      setPreviewHtml(response.data.html);
    } catch (err) {
      setError('Failed to generate preview');
      console.error(err);
    }
  }

  async function handleSave(asDraft: boolean = true) {
    if (!templateHtml.trim()) {
      setError('Template HTML cannot be empty');
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (currentTemplate) {
        // Update existing template
        await api.put(`/api/report-templates/${currentTemplate.template_id}`, {
          templateHtml,
          description: templateDescription
        });
        setSuccess('Template updated successfully!');
      } else {
        // Create new template
        const response = await api.post('/api/report-templates', {
          reportType: activeTab,
          templateHtml,
          description: templateDescription
        });
        setSuccess('Template created successfully!');
      }

      // Reload templates
      await loadTemplates();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save template');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault() {
    if (!currentTemplate) {
      setError('No template selected');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await api.post(`/api/report-templates/${currentTemplate.template_id}/set-default`);
      setSuccess('Template set as default!');
      await loadTemplates();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to set template as default');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!currentTemplate) {
      setError('No template selected');
      return;
    }

    if (!confirm(`Delete this template? This action cannot be undone.`)) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await api.delete(`/api/report-templates/${currentTemplate.template_id}`);
      setSuccess('Template deleted successfully!');
      setCurrentTemplate(null);
      setTemplateHtml('');
      await loadTemplates();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete template');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function insertVariable(varName: string) {
    if (editorRef.current) {
      const editor = editorRef.current.editor;
      const session = editor.getSession();
      const range = editor.getSelectionRange();
      session.replace(range, `\${${varName}}`);
      editor.focus();
    }
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
                Report Template Editor
              </h1>
              <p className="text-slate-600">
                Customize HTML templates for assessment, permit, and endorsement reports. Use {'${variable_name}'} syntax for dynamic content.
              </p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                {success}
              </div>
            )}

            {/* Report Type Tabs */}
            <div className="mb-6 flex gap-2 border-b border-slate-200">
              {(['assessment', 'permit', 'endorsement'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveTab(type)}
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeTab === type
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)} Report
                </button>
              ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Editor Panel (3 columns) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Current Template Info */}
                {currentTemplate && (
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Version</span>
                        <p className="font-semibold">{currentTemplate.version}</p>
                      </div>
                      <div>
                        <span className="text-slate-600">Status</span>
                        <p className="font-semibold">{currentTemplate.is_default ? '⭐ Default' : 'Draft'}</p>
                      </div>
                      <div>
                        <span className="text-slate-600">Created</span>
                        <p className="font-semibold text-xs">
                          {new Date(currentTemplate.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-600">Modified</span>
                        <p className="font-semibold text-xs">
                          {new Date(currentTemplate.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description Input */}
                <div className="bg-white rounded-lg shadow p-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Template Description
                  </label>
                  <input
                    type="text"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Optional description for this template"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Ace Editor */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-semibold text-slate-900">HTML Template</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Edit the HTML template below. Use {'${variable_name}'} to insert dynamic variables.
                    </p>
                  </div>
                  <AceEditor
                    ref={editorRef}
                    mode="html"
                    theme="github"
                    value={templateHtml}
                    onChange={setTemplateHtml}
                    height="500px"
                    width="100%"
                    setOptions={{
                      useWorker: false,
                      enableBasicAutocompletion: true,
                      enableLiveAutocompletion: true,
                      showLineNumbers: true,
                      tabSize: 2,
                      fontSize: 14,
                    }}
                  />
                </div>

                {/* Save Buttons */}
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors font-medium"
                  >
                    {saving ? 'Saving...' : '💾 Save Draft'}
                  </button>
                  <button
                    onClick={handleSetDefault}
                    disabled={saving}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-400 transition-colors font-medium"
                  >
                    ⭐ Set as Default
                  </button>
                  {currentTemplate && (
                    <button
                      onClick={handleDelete}
                      disabled={saving || currentTemplate.is_default}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-400 transition-colors font-medium"
                      title={currentTemplate.is_default ? 'Cannot delete default template' : ''}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Sidebar (Variables + Preview) */}
              <div className="lg:col-span-1 space-y-6">
                {/* Variable Reference */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-semibold text-slate-900 text-sm">Available Variables</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-3 space-y-3">
                    {Object.entries(variables).map(([category, vars]) => (
                      <div key={category}>
                        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                          {category}
                        </h4>
                        <div className="space-y-1.5">
                          {vars.map((variable: any) => {
                            // Parse variable object from string
                            let varObj = { name: '', description: '' };
                            if (typeof variable === 'string') {
                              try {
                                varObj = eval('(' + variable + ')');
                              } catch (e) {
                                varObj = { name: variable, description: '' };
                              }
                            } else {
                              varObj = variable;
                            }

                            return (
                              <button
                                key={varObj.name}
                                onClick={() => insertVariable(varObj.name)}
                                className="w-full text-left px-2 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                title={varObj.description}
                              >
                                <code className="font-mono text-blue-700">${'{'}
                                  {varObj.name}
                                {'}'}</code>
                                <p className="text-slate-600 text-xs mt-0.5 truncate">{varObj.description}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview Panel */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Preview with Application Data
                    </label>
                  </div>
                  <div className="p-3 space-y-2">
                    <select
                      value={selectedAppId}
                      onChange={(e) => setSelectedAppId(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select application...</option>
                      {applications.map((app) => (
                        <option key={app.application_id} value={app.application_id}>
                          {app.application_number} - {app.entity_name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handlePreview}
                      disabled={!selectedAppId || !currentTemplate}
                      className="w-full px-3 py-1.5 text-sm bg-violet-600 text-white rounded hover:bg-violet-700 disabled:bg-slate-400 transition-colors font-medium"
                    >
                      👁️ Generate Preview
                    </button>
                  </div>

                  {previewHtml && (
                    <div className="border-t border-slate-200 p-3 max-h-96 overflow-y-auto bg-slate-50">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Preview Output:</p>
                      <iframe
                        title="preview"
                        srcDoc={previewHtml}
                        className="w-full h-64 border border-slate-200 rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

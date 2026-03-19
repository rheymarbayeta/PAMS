/**
 * Shared utilities for editable report templates
 * Place this file at: frontend/public/js/report-editor.js
 * Usage: Include this script before your report HTML rendering scripts
 */

class ReportEditor {
  constructor(applicationId, authToken, reportType, apiBaseUrl) {
    this.applicationId = applicationId;
    this.authToken = authToken;
    this.reportType = reportType;
    this.apiBaseUrl = apiBaseUrl;
    this.editMode = false;
    this.userCanEdit = false;
    this.customizationData = null;
    this.quillEditors = {};
    this.originalContent = {};
    this.currentContent = {};
    this.userRole = null;
  }

  /**
   * Extract user role from JWT token
   */
  extractUserFromToken() {
    try {
      if (!this.authToken) return;
      const parts = this.authToken.split('.');
      if (parts.length !== 3) return;
      const decoded = JSON.parse(atob(parts[1]));
      this.userRole = decoded.role_name;
      this.checkEditPermissions();
    } catch (error) {
      console.error('Error extracting user from token:', error);
    }
  }

  /**
   * Check if current user can edit reports
   */
  checkEditPermissions() {
    const allowedRoles = ['Admin', 'SuperAdmin', 'Approver', 'Assessor'];
    this.userCanEdit = allowedRoles.includes(this.userRole);

    const editBtn = document.getElementById('editBtn');
    if (editBtn && this.userCanEdit) {
      editBtn.style.display = 'inline-block';
    }
  }

  /**
   * Load existing customizations from API
   */
  async loadCustomization() {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/applications/${this.applicationId}/report-customization/${this.reportType}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          credentials: 'include'
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.customization) {
          this.customizationData = data.customization;
          console.log(`Loaded ${this.reportType} customization:`, this.customizationData);
        }
      }
    } catch (error) {
      console.warn(`Could not load ${this.reportType} report customization:`, error);
    }
  }

  /**
   * Apply saved customizations to rendered report
   */
  applyCustomizations(customContent) {
    Object.keys(customContent).forEach(fieldName => {
      const elements = document.querySelectorAll(`[data-edit-field="${fieldName}"]`);
      elements.forEach(elem => {
        elem.innerHTML = customContent[fieldName];
      });
    });
  }

  /**
   * Toggle edit mode on/off
   */
  toggleEditMode() {
    if (!this.userCanEdit) {
      alert('You do not have permission to edit this report');
      return;
    }

    this.editMode = !this.editMode;

    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const revertBtn = document.getElementById('revertBtn');
    const printBtn = document.getElementById('printBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const indicator = document.getElementById('editModeIndicator');

    if (this.editMode) {
      editBtn.style.display = 'none';
      saveBtn.style.display = 'inline-block';
      cancelBtn.style.display = 'inline-block';
      revertBtn.style.display = 'inline-block';
      if (printBtn) printBtn.disabled = true;
      if (downloadBtn) downloadBtn.disabled = true;
      if (indicator) indicator.classList.add('active');
      this.initializeEditFields();
    } else {
      editBtn.style.display = 'inline-block';
      saveBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
      revertBtn.style.display = 'none';
      if (printBtn) printBtn.disabled = false;
      if (downloadBtn) downloadBtn.disabled = false;
      if (indicator) indicator.classList.remove('active');
      this.destroyQuillEditors();
      document.querySelectorAll('[data-edit-field]').forEach(elem => {
        elem.classList.remove('edit-mode');
      });
    }
  }

  /**
   * Initialize editable fields in edit mode
   */
  initializeEditFields() {
    const editableElements = document.querySelectorAll('[data-edit-field]');

    editableElements.forEach(elem => {
      const fieldName = elem.dataset.editField;
      const fieldType = elem.dataset.editType || 'text';

      // Store original value
      if (!elem.dataset.originalValue) {
        elem.dataset.originalValue = elem.innerHTML;
      }

      // Get current value
      const currentValue = this.customizationData?.customContent?.[fieldName] || elem.innerHTML;

      if (fieldType === 'richtext') {
        this.createRichTextEditor(elem, fieldName, currentValue);
      } else {
        this.createTextInput(elem, fieldName, currentValue);
      }

      elem.classList.add('edit-mode');
    });
  }

  /**
   * Create a text input for simple field editing
   */
  createTextInput(elem, fieldName, value) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-edit-input';
    input.value = value || '';
    input.dataset.fieldName = fieldName;

    elem.innerHTML = '';
    elem.appendChild(input);
  }

  /**
   * Create a Quill rich text editor for complex content
   */
  createRichTextEditor(elem, fieldName, value) {
    const editorId = `editor-${fieldName}`;
    const container = document.createElement('div');
    container.id = editorId;
    container.innerHTML = value || '';

    elem.innerHTML = '';
    elem.appendChild(container);

    const quill = new Quill(`#${editorId}`, {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          ['list'],
          ['link']
        ]
      }
    });

    this.quillEditors[fieldName] = quill;
  }

  /**
   * Cleanup Quill editors
   */
  destroyQuillEditors() {
    this.quillEditors = {};
  }

  /**
   * Save customizations to backend
   */
  async saveCustomization(onSuccess) {
    try {
      // Collect edited content
      const customContent = {};

      // Collect text inputs
      document.querySelectorAll('input.text-edit-input').forEach(input => {
        const fieldName = input.dataset.fieldName;
        customContent[fieldName] = input.value;
      });

      // Collect Quill editors
      Object.keys(this.quillEditors).forEach(fieldName => {
        customContent[fieldName] = this.quillEditors[fieldName].root.innerHTML;
      });

      console.log(`Saving ${this.reportType} customization:`, customContent);

      const response = await fetch(
        `${this.apiBaseUrl}/api/applications/${this.applicationId}/report-customization/${this.reportType}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            customContent,
            isSaved: true
          }),
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save customization');
      }

      alert('Report changes saved successfully!');

      // Exit edit mode
      this.editMode = true;
      this.toggleEditMode();

      // Reload customizations
      await this.loadCustomization();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Save customization error:', error);
      alert('Error saving changes: ' + error.message);
    }
  }

  /**
   * Revert all edits and restore original content
   */
  async revertToOriginal(onSuccess) {
    if (!confirm('Are you sure you want to discard all edits and restore the original report?')) {
      return;
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/applications/${this.applicationId}/report-customization/${this.reportType}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revert');
      }

      alert('Report reverted to original content');

      // Clear customization data
      this.customizationData = null;

      // Exit edit mode
      this.editMode = true;
      this.toggleEditMode();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Revert error:', error);
      alert('Error reverting changes: ' + error.message);
    }
  }

  /**
   * Initialize the editor on page load
   */
  async initialize() {
    this.extractUserFromToken();
    await this.loadCustomization();
    if (this.customizationData && this.customizationData.customContent) {
      this.applyCustomizations(this.customizationData.customContent);
    }
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportEditor;
}

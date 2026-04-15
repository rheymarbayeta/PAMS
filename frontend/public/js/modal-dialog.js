/**
 * Modal Dialog Utility
 * Provides modal-based alert and confirm dialogs for consistent UI across all pages
 */

// Create modal styles if not already present
function initializeModalStyles() {
  if (document.getElementById('modal-dialog-styles')) {
    return;
  }

  const styleEl = document.createElement('style');
  styleEl.id = 'modal-dialog-styles';
  styleEl.innerHTML = `
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }
    
    .modal-overlay.show {
      display: flex;
    }
    
    .modal-dialog {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      min-width: 300px;
      max-width: 500px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      animation: modalSlideIn 0.3s ease-out;
    }
    
    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .modal-header {
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    
    .modal-body {
      padding: 20px;
      flex: 1;
      overflow-y: auto;
      color: #555;
      line-height: 1.5;
      word-wrap: break-word;
    }
    
    .modal-footer {
      padding: 15px 20px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    
    .modal-button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    
    .modal-button-primary {
      background-color: #007bff;
      color: white;
    }
    
    .modal-button-primary:hover {
      background-color: #0056b3;
    }
    
    .modal-button-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .modal-button-secondary:hover {
      background-color: #5a6268;
    }
    
    .modal-button-danger {
      background-color: #dc3545;
      color: white;
    }
    
    .modal-button-danger:hover {
      background-color: #c82333;
    }
  `;
  document.head.appendChild(styleEl);
}

/**
 * Show a modal alert dialog
 * @param {string} message - The message to display
 * @param {string} title - The dialog title (default: "Alert")
 * @param {function} callback - Optional callback when OK is clicked
 */
function modalAlert(message, title = 'Alert', callback = null) {
  initializeModalStyles();
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.id = 'modal-alert-overlay';
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';
  
  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  header.textContent = title;
  
  // Body
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.textContent = message;
  
  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  
  const okBtn = document.createElement('button');
  okBtn.className = 'modal-button modal-button-primary';
  okBtn.textContent = 'OK';
  okBtn.onclick = () => {
    overlay.remove();
    if (callback) callback();
  };
  
  footer.appendChild(okBtn);
  
  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  
  document.body.appendChild(overlay);
  
  // Focus OK button
  okBtn.focus();
  
  // Close on Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      okBtn.click();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
}

/**
 * Show a modal confirm dialog
 * @param {string} message - The message to display
 * @param {string} title - The dialog title (default: "Confirm")
 * @param {function} onConfirm - Callback when OK/Yes is clicked
 * @param {function} onCancel - Optional callback when Cancel/No is clicked
 * @param {object} options - Optional configuration
 *   - okText: Text for OK button (default: "OK")
 *   - cancelText: Text for Cancel button (default: "Cancel")
 *   - isDangerous: If true, use danger styling for OK button (default: false)
 */
function modalConfirm(message, title = 'Confirm', onConfirm, onCancel = null, options = {}) {
  initializeModalStyles();
  
  const {
    okText = 'OK',
    cancelText = 'Cancel',
    isDangerous = false
  } = options;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.id = 'modal-confirm-overlay';
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';
  
  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  header.textContent = title;
  
  // Body
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.textContent = message;
  
  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'modal-button modal-button-secondary';
  cancelBtn.textContent = cancelText;
  cancelBtn.onclick = () => {
    overlay.remove();
    if (onCancel) onCancel();
  };
  
  const okBtn = document.createElement('button');
  okBtn.className = `modal-button ${isDangerous ? 'modal-button-danger' : 'modal-button-primary'}`;
  okBtn.textContent = okText;
  okBtn.onclick = () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  };
  
  footer.appendChild(cancelBtn);
  footer.appendChild(okBtn);
  
  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  
  document.body.appendChild(overlay);
  
  // Focus OK button
  okBtn.focus();
  
  // Handle keyboard
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      okBtn.click();
      document.removeEventListener('keydown', handleKeyDown);
    } else if (e.key === 'Escape') {
      cancelBtn.click();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
}

// Polyfill for older code using global alert/confirm
// This is optional - you can use modalAlert/modalConfirm directly instead
window.modalAlert = modalAlert;
window.modalConfirm = modalConfirm;

/**
 * Modal Dialog Utilities for React Components
 * Wraps the global modal-dialog.js functions for TypeScript/React usage
 */

declare global {
  interface Window {
    modalAlert: (message: string, title?: string, callback?: () => void) => void;
    modalConfirm: (
      message: string,
      title?: string,
      onConfirm?: () => void,
      onCancel?: () => void,
      options?: { okText?: string; cancelText?: string; isDangerous?: boolean }
    ) => void;
  }
}

/**
 * Show a modal alert dialog
 * @param message - The message to display
 * @param title - The dialog title (default: "Alert")
 * @param callback - Optional callback when OK is clicked
 */
export const showAlert = (message: string, title = 'Alert', callback?: () => void) => {
  if (typeof window !== 'undefined' && window.modalAlert) {
    window.modalAlert(message, title, callback);
  } else {
    // Fallback to native alert if modal-dialog.js hasn't loaded
    alert(message);
    if (callback) callback();
  }
};

/**
 * Show a modal confirm dialog
 * @param message - The message to display
 * @param title - The dialog title (default: "Confirm")
 * @param onConfirm - Callback when OK/Yes is clicked
 * @param onCancel - Optional callback when Cancel/No is clicked
 * @param options - Optional configuration
 *   - okText: Text for OK button (default: "OK")
 *   - cancelText: Text for Cancel button (default: "Cancel")
 *   - isDangerous: If true, use danger styling for OK button (default: false)
 */
export const showConfirm = (
  message: string,
  title = 'Confirm',
  onConfirm?: () => void,
  onCancel?: () => void,
  options?: { okText?: string; cancelText?: string; isDangerous?: boolean }
) => {
  if (typeof window !== 'undefined' && window.modalConfirm) {
    window.modalConfirm(message, title, onConfirm, onCancel, options);
  } else {
    // Fallback to native confirm if modal-dialog.js hasn't loaded
    if (confirm(message)) {
      if (onConfirm) onConfirm();
    } else {
      if (onCancel) onCancel();
    }
  }
};

/**
 * Promise-based confirm dialog
 * Returns a Promise that resolves to true if confirmed, false if cancelled
 */
export const confirmAsync = (
  message: string,
  title = 'Confirm',
  options?: { okText?: string; cancelText?: string; isDangerous?: boolean }
): Promise<boolean> => {
  return new Promise((resolve) => {
    showConfirm(
      message,
      title,
      () => resolve(true),
      () => resolve(false),
      options
    );
  });
};

/**
 * Promise-based alert dialog
 * Returns a Promise that resolves when OK is clicked
 */
export const alertAsync = (message: string, title = 'Alert'): Promise<void> => {
  return new Promise((resolve) => {
    showAlert(message, title, () => resolve());
  });
};

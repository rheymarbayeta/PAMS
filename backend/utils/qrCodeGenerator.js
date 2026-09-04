'use strict';

const QRCode = require('qrcode');

/**
 * Generate a base64 Data URL (PNG) representation of a QR code.
 * Suitable for embedding directly in HTML <img> tags: src="data:image/png;base64,..."
 *
 * @param {string} text - Content to encode
 * @param {Object} [options] - QRCode options (margin, width, color, etc.)
 * @returns {Promise<string>} Data URL string
 */
async function generateQRCodeDataURL(text, options = {}) {
  const defaultOptions = {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: options.width || 120,
    color: {
      dark: '#000000',
      light: '#ffffff'
    },
    ...options
  };
  return QRCode.toDataURL(String(text || ''), defaultOptions);
}

/**
 * Generate a PNG Buffer representation of a QR code.
 * Suitable for inserting into PDF documents (e.g. PDFKit doc.image(buffer)).
 *
 * @param {string} text - Content to encode
 * @param {Object} [options] - QRCode options (margin, width, etc.)
 * @returns {Promise<Buffer>} PNG Buffer
 */
async function generateQRCodeBuffer(text, options = {}) {
  const defaultOptions = {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: options.width || 120,
    type: 'png',
    color: {
      dark: '#000000',
      light: '#ffffff'
    },
    ...options
  };
  return QRCode.toBuffer(String(text || ''), defaultOptions);
}

/**
 * Generate an SVG string representation of a QR code.
 *
 * @param {string} text - Content to encode
 * @param {Object} [options] - QRCode options
 * @returns {Promise<string>} SVG XML string
 */
async function generateQRCodeSVG(text, options = {}) {
  const defaultOptions = {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: options.width || 120,
    ...options
  };
  return QRCode.toString(String(text || ''), { ...defaultOptions, type: 'svg' });
}

module.exports = {
  generateQRCodeDataURL,
  generateQRCodeBuffer,
  generateQRCodeSVG
};

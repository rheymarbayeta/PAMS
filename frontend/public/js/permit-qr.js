/**
 * Shared permit QR code rendering for PAMS permit HTML templates.
 * Requires /js/qrcode.min.js loaded before this script.
 */
(function (global) {
  function getPermitQrPayload(appData) {
    const app = appData || {};
    const value =
      app.application_number ||
      app.permit_number ||
      app.application_id ||
      'PERMIT';
    return `PAMS-PERMIT:${value}`;
  }

  async function renderPermitQRCodes(appData, options) {
    if (typeof QRCode === 'undefined') {
      console.warn('QRCode library not loaded — permit QR skipped');
      return;
    }

    const slots = document.querySelectorAll('[data-permit-qr]');
    if (!slots.length) return;

    const payload = getPermitQrPayload(appData);
    const width = (options && options.width) || 66;

    try {
      const dataUrl = await QRCode.toDataURL(payload, {
        width,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });

      slots.forEach((slot) => {
        slot.innerHTML =
          `<img src="${dataUrl}" alt="Permit QR" width="${width}" height="${width}" style="display:block;" />`;
        slot.title = payload;
      });
    } catch (err) {
      console.warn('Permit QR render failed:', err);
    }
  }

  global.PermitQR = {
    getPermitQrPayload,
    renderPermitQRCodes,
  };
})(typeof window !== 'undefined' ? window : global);

import QRCode from 'qrcode';

/**
 * Generate a PNG data URL for embedding in <img src="...">.
 */
export async function generateQRCodeDataURL(
  text: string,
  options: { width?: number; margin?: number } = {}
): Promise<string> {
  return QRCode.toDataURL(String(text || ''), {
    errorCorrectionLevel: 'M',
    margin: options.margin ?? 1,
    width: options.width ?? 120,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

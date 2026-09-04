'use client';

import { useEffect, useState } from 'react';
import { generateQRCodeDataURL } from '@/utils/qrCode';

type QRCodeImageProps = {
  value: string;
  size?: number;
  alt?: string;
  className?: string;
  title?: string;
};

/**
 * Client-side QR code rendered as an <img> (works on screen and in print).
 */
export function QRCodeImage({
  value,
  size = 72,
  alt = 'QR Code',
  className = '',
  title,
}: QRCodeImageProps) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setSrc('');
      return;
    }

    generateQRCodeDataURL(value, { width: size })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch((err) => {
        console.error('QR code generation failed:', err);
        if (!cancelled) setSrc('');
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      title={title || value}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    />
  );
}

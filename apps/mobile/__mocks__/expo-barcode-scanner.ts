/**
 * Mock for expo-barcode-scanner.
 */
import React from 'react';

export const BarCodeScanner = Object.assign(
  jest.fn(({ children }: { children?: React.ReactNode }) =>
    React.createElement('View', { testID: 'mock-barcode-scanner' }, children)
  ),
  {
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
    getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
    scanFromURLAsync: jest.fn(async () => []),
    Constants: { BarCodeType: { qr: 'org.iso.QRCode', aztec: 'org.iso.Aztec' } },
  }
);

export const BarCodeType = {
  qr: 'org.iso.QRCode',
  aztec: 'org.iso.Aztec',
  code128: 'com.intermec.code128',
  code39: 'com.intermec.code39',
  ean13: 'org.gs1.EAN-13',
};

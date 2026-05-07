/**
 * Mock for expo-camera.
 */
import React from 'react';

export const Camera = Object.assign(
  jest.fn(({ children }: { children?: React.ReactNode }) =>
    React.createElement('View', { testID: 'mock-camera' }, children)
  ),
  {
    requestCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
    getCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
    requestMicrophonePermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
    isAvailableAsync: jest.fn(async () => true),
  }
);

export const CameraType = { front: 'front', back: 'back' };
export const FlashMode = { on: 'on', off: 'off', auto: 'auto', torch: 'torch' };
export const CameraView = Camera;

/**
 * Mock for expo-local-authentication.
 * Default: device supports biometrics and authentication succeeds.
 */
export const AuthenticationType = {
  FINGERPRINT: 1,
  FACIAL_RECOGNITION: 2,
  IRIS: 3,
};

export const SecurityLevel = {
  NONE: 0,
  SECRET: 1,
  BIOMETRIC_WEAK: 2,
  BIOMETRIC_STRONG: 3,
};

export const hasHardwareAsync = jest.fn(async () => true);
export const isEnrolledAsync = jest.fn(async () => true);
export const supportedAuthenticationTypesAsync = jest.fn(async () => [AuthenticationType.FINGERPRINT]);
export const getEnrolledLevelAsync = jest.fn(async () => SecurityLevel.BIOMETRIC_STRONG);

export const authenticateAsync = jest.fn(async (_options?: object) => ({
  success: true,
}));

export const cancelAuthenticate = jest.fn();

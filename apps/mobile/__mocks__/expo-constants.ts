/**
 * Mock for expo-constants.
 */
const Constants = {
  expoConfig: {
    name: 'school-erp-mobile',
    slug: 'school-erp-mobile',
    version: '1.0.0',
    extra: {
      apiUrl: 'http://localhost:3000',
      eas: { projectId: 'test-project-id' },
    },
  },
  easConfig: { projectId: 'test-project-id' },
  executionEnvironment: 'storeClient',
  isDevice: false,
  platform: { ios: undefined, android: undefined, web: undefined },
  sessionId: 'test-session-id',
  statusBarHeight: 44,
  systemVersion: '17.0',
};

export default Constants;
export const { expoConfig, executionEnvironment, isDevice, statusBarHeight } = Constants;

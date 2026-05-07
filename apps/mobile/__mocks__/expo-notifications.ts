/**
 * Mock for expo-notifications.
 */
export const getExpoPushTokenAsync = jest.fn(async () => ({ data: 'ExponentPushToken[test-token]' }));
export const getPermissionsAsync = jest.fn(async () => ({ status: 'granted', granted: true }));
export const requestPermissionsAsync = jest.fn(async () => ({ status: 'granted', granted: true }));

export const scheduleNotificationAsync = jest.fn(async () => 'notification-id');
export const cancelScheduledNotificationAsync = jest.fn(async () => {});
export const cancelAllScheduledNotificationsAsync = jest.fn(async () => {});
export const getAllScheduledNotificationsAsync = jest.fn(async () => []);

export const setNotificationHandler = jest.fn();
export const addNotificationReceivedListener = jest.fn(() => ({ remove: jest.fn() }));
export const addNotificationResponseReceivedListener = jest.fn(() => ({ remove: jest.fn() }));
export const removeNotificationSubscription = jest.fn();

export const setBadgeCountAsync = jest.fn(async () => true);
export const getBadgeCountAsync = jest.fn(async () => 0);

export const AndroidImportance = {
  NONE: 0,
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
};

export const setNotificationChannelAsync = jest.fn(async () => null);

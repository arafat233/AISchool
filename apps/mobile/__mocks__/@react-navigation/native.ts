/**
 * Mock for @react-navigation/native.
 */
export const useNavigation = jest.fn(() => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
}));

export const useRoute = jest.fn(() => ({ key: 'test', name: 'Test', params: {} }));
export const useFocusEffect = jest.fn((cb: () => void | (() => void)) => { cb(); });
export const useIsFocused = jest.fn(() => true);
export const useNavigationState = jest.fn(() => null);

export const NavigationContainer = ({ children }: { children: React.ReactNode }) => children;
export const createNavigatorFactory = jest.fn();

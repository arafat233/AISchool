/**
 * Mock for expo-router.
 * Stubs navigation primitives so component tests don't need the native router.
 */
import React from 'react';

export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => false),
  navigate: jest.fn(),
}));

export const useLocalSearchParams = jest.fn(() => ({}));
export const useGlobalSearchParams = jest.fn(() => ({}));
export const usePathname = jest.fn(() => '/');
export const useSegments = jest.fn(() => []);

export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
};

export const Link = ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: any }) =>
  React.createElement('a', { href, ...rest }, children);

export const Redirect = ({ href }: { href: string }) =>
  React.createElement('div', { 'data-redirect': href });

export const Stack = Object.assign(
  ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  { Screen: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children) }
);

export const Tabs = Object.assign(
  ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  { Screen: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children) }
);

export const Slot = () => React.createElement(React.Fragment, null);

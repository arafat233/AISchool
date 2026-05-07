/**
 * Mock for @react-navigation/native-stack.
 */
import React from 'react';

export const createNativeStackNavigator = jest.fn(() => ({
  Navigator: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  Screen: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

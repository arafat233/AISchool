/**
 * Mock for @react-navigation/bottom-tabs.
 */
import React from 'react';

export const createBottomTabNavigator = jest.fn(() => ({
  Navigator: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  Screen: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

export const BottomTabBar = jest.fn(() => null);

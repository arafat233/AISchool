/**
 * Mock for expo-secure-store.
 * Uses a simple in-memory Map so tests don't need the native module.
 */
const store = new Map<string, string>();

export const getItemAsync = jest.fn(async (key: string) => store.get(key) ?? null);
export const setItemAsync = jest.fn(async (key: string, value: string) => { store.set(key, value); });
export const deleteItemAsync = jest.fn(async (key: string) => { store.delete(key); });

export function __reset() { store.clear(); }

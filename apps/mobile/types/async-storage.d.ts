declare module "@react-native-async-storage/async-storage" {
  interface AsyncStorageStatic {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
    clear: () => Promise<void>;
    getAllKeys: () => Promise<readonly string[]>;
    multiGet: (keys: readonly string[]) => Promise<readonly [string, string | null][]>;
    multiSet: (keyValuePairs: readonly [string, string][]) => Promise<void>;
    multiRemove: (keys: readonly string[]) => Promise<void>;
  }
  const AsyncStorage: AsyncStorageStatic;
  export default AsyncStorage;
}

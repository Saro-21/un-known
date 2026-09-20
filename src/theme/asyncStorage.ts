/**
 * AsyncStorage Cross-Platform Wrapper
 * Provides React Native / Expo AsyncStorage-compatible API on Web,
 * with localStorage backing and in-memory fallback for sandboxed/incognito environments.
 */

class MemoryStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }
}

class CrossPlatformAsyncStorage {
  private memFallback = new MemoryStorage();
  private isLocalStorageAvailable: boolean = false;

  constructor() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const testKey = '__test_async_storage__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        this.isLocalStorageAvailable = true;
      }
    } catch {
      this.isLocalStorageAvailable = false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.isLocalStorageAvailable) {
        return window.localStorage.getItem(key);
      }
      return this.memFallback.getItem(key);
    } catch (e) {
      console.warn(`[AsyncStorage] Failed to getItem(${key}):`, e);
      return this.memFallback.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isLocalStorageAvailable) {
        window.localStorage.setItem(key, value);
      }
      this.memFallback.setItem(key, value);
    } catch (e) {
      console.warn(`[AsyncStorage] Failed to setItem(${key}):`, e);
      this.memFallback.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (this.isLocalStorageAvailable) {
        window.localStorage.removeItem(key);
      }
      this.memFallback.removeItem(key);
    } catch (e) {
      console.warn(`[AsyncStorage] Failed to removeItem(${key}):`, e);
      this.memFallback.removeItem(key);
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.isLocalStorageAvailable) {
        window.localStorage.clear();
      }
      this.memFallback.clear();
    } catch (e) {
      console.warn('[AsyncStorage] Failed to clear():', e);
      this.memFallback.clear();
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      if (this.isLocalStorageAvailable) {
        return Object.keys(window.localStorage);
      }
      return this.memFallback.getAllKeys();
    } catch {
      return this.memFallback.getAllKeys();
    }
  }

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    const results: [string, string | null][] = [];
    for (const key of keys) {
      const val = await this.getItem(key);
      results.push([key, val]);
    }
    return results;
  }

  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    for (const [key, value] of keyValuePairs) {
      await this.setItem(key, value);
    }
  }
}

export const AsyncStorage = new CrossPlatformAsyncStorage();
export default AsyncStorage;

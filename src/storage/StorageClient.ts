export class StorageClient {
  async get<T>(keys?: string[] | string | null): Promise<Record<string, T>> {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys ?? null, (data) => resolve(data as Record<string, T>));
    });
  }

  async set<T extends Record<string, unknown>>(data: T): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => resolve());
    });
  }
}

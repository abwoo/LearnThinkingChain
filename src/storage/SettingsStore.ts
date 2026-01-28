import type { ExtensionSettings } from '../types/Settings';
import { StorageClient } from './StorageClient';

export class SettingsStore {
  private readonly storage: StorageClient;

  constructor(storage = new StorageClient()) {
    this.storage = storage;
  }

  async load(): Promise<ExtensionSettings | null> {
    const result = await this.storage.get<ExtensionSettings>('ltc_settings');
    return (result.ltc_settings as ExtensionSettings) ?? null;
  }

  async save(settings: ExtensionSettings): Promise<void> {
    await this.storage.set({ ltc_settings: settings });
  }
}

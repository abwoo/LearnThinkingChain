import type { CognitiveProfile } from '../types/CognitiveProfile';
import { StorageClient } from './StorageClient';

export class ProfileStore {
  private readonly storage: StorageClient;

  constructor(storage = new StorageClient()) {
    this.storage = storage;
  }

  async load(): Promise<CognitiveProfile | null> {
    const result = await this.storage.get<CognitiveProfile>('ltc_profile');
    return (result.ltc_profile as CognitiveProfile) ?? null;
  }

  async save(profile: CognitiveProfile): Promise<void> {
    await this.storage.set({ ltc_profile: profile });
  }
}

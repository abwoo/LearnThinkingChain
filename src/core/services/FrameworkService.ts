export type FrameworkEntry = {
  id: string;
  name: string;
  created_at: number;
};

const FRAMEWORK_KEY = 'ltc_frameworks';
const MAX_ENTRIES = 30;

export class FrameworkService {
  static async getAll(): Promise<FrameworkEntry[]> {
    const data = await chrome.storage.local.get(FRAMEWORK_KEY);
    const raw = data[FRAMEWORK_KEY];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => this.normalize(item))
      .filter((item): item is FrameworkEntry => Boolean(item));
  }

  static async add(name: string): Promise<FrameworkEntry[]> {
    const existing = await this.getAll();
    const entry: FrameworkEntry = {
      id: this.buildId(),
      name,
      created_at: Date.now()
    };
    const next = [entry, ...existing].slice(0, MAX_ENTRIES);
    await chrome.storage.local.set({ [FRAMEWORK_KEY]: next });
    return next;
  }

  static async remove(id: string): Promise<FrameworkEntry[]> {
    const existing = await this.getAll();
    const next = existing.filter((item) => item.id !== id);
    await chrome.storage.local.set({ [FRAMEWORK_KEY]: next });
    return next;
  }

  static async setAll(entries: FrameworkEntry[]): Promise<FrameworkEntry[]> {
    const normalized = entries
      .map((item) => this.normalize(item))
      .filter((item): item is FrameworkEntry => Boolean(item));
    const next = normalized.slice(0, MAX_ENTRIES);
    await chrome.storage.local.set({ [FRAMEWORK_KEY]: next });
    return next;
  }

  private static normalize(entry: unknown): FrameworkEntry | null {
    if (!entry || typeof entry !== 'object') return null;
    const data = entry as Partial<FrameworkEntry>;
    if (typeof data.name !== 'string') return null;
    return {
      id: typeof data.id === 'string' ? data.id : this.buildId(),
      name: data.name.trim(),
      created_at: typeof data.created_at === 'number' ? data.created_at : Date.now()
    };
  }

  private static buildId(): string {
    return `fw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

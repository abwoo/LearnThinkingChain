export type HistoryEntry = {
  id: string;
  title: string;
  desc: string;
  created_at: number;
};

const HISTORY_KEY = 'ltc_last_thinking_steps';
const MAX_ENTRIES = 12;

export class HistoryService {
  static async getHistory(): Promise<HistoryEntry[]> {
    const data = await chrome.storage.local.get(HISTORY_KEY);
    const raw = data[HISTORY_KEY];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => this.normalizeEntry(item))
      .filter((item): item is HistoryEntry => Boolean(item));
  }

  static async appendEntry(entry: Omit<HistoryEntry, 'id'> & Partial<Pick<HistoryEntry, 'id'>>): Promise<HistoryEntry[]> {
    const history = await this.getHistory();
    const normalized = this.normalizeEntry({
      ...entry,
      id: entry.id || this.buildId()
    });
    if (!normalized) return history;
    const nextHistory = [normalized, ...history].slice(0, MAX_ENTRIES);
    await chrome.storage.local.set({ [HISTORY_KEY]: nextHistory });
    return nextHistory;
  }

  static async deleteEntry(id: string): Promise<HistoryEntry[]> {
    const history = await this.getHistory();
    const nextHistory = history.filter((item) => item.id !== id);
    await chrome.storage.local.set({ [HISTORY_KEY]: nextHistory });
    return nextHistory;
  }

  static async setHistory(entries: HistoryEntry[]): Promise<HistoryEntry[]> {
    const normalized = entries
      .map((item) => this.normalizeEntry(item))
      .filter((item): item is HistoryEntry => Boolean(item));
    const nextHistory = normalized.slice(0, MAX_ENTRIES);
    await chrome.storage.local.set({ [HISTORY_KEY]: nextHistory });
    return nextHistory;
  }

  static async clearHistory(): Promise<void> {
    await chrome.storage.local.set({ [HISTORY_KEY]: [] });
  }

  private static normalizeEntry(entry: unknown): HistoryEntry | null {
    if (!entry || typeof entry !== 'object') return null;
    const data = entry as Partial<HistoryEntry>;
    if (typeof data.title !== 'string' || typeof data.desc !== 'string') return null;
    const createdAt = typeof data.created_at === 'number' ? data.created_at : Date.now();
    const id = typeof data.id === 'string' ? data.id : this.buildId();
    return {
      id,
      title: data.title,
      desc: data.desc,
      created_at: createdAt
    };
  }

  private static buildId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

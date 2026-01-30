export type HistoryEntry = {
  id: string;
  title: string;
  desc: string;
  url?: string;
  timestamp?: number;
};

type NormalizeResult = {
  entries: HistoryEntry[];
  changed: boolean;
};

export class HistoryService {
  private static readonly key = 'ltc_last_thinking_steps';

  private static normalize(raw: unknown): NormalizeResult {
    if (!Array.isArray(raw)) {
      return { entries: [], changed: false };
    }

    let changed = false;
    const entries = raw
      .filter((item) => item && typeof item === 'object')
      .map((item, index) => {
        const record = item as Partial<HistoryEntry>;
        const id = typeof record.id === 'string' && record.id.length > 0
          ? record.id
          : `h_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
        if (id !== record.id) changed = true;
        return {
          id,
          title: typeof record.title === 'string' ? record.title : 'Untitled',
          desc: typeof record.desc === 'string' ? record.desc : '',
          url: typeof record.url === 'string' ? record.url : undefined,
          timestamp: typeof record.timestamp === 'number' ? record.timestamp : undefined
        };
      });

    return { entries, changed };
  }

  static async getHistory(): Promise<HistoryEntry[]> {
    const data = await chrome.storage.local.get(HistoryService.key);
    const raw = data[HistoryService.key];
    const normalized = HistoryService.normalize(raw);
    if (normalized.changed) {
      await chrome.storage.local.set({ [HistoryService.key]: normalized.entries });
    }
    return normalized.entries;
  }

  static async addEntry(entry: HistoryEntry): Promise<HistoryEntry[]> {
    const history = await HistoryService.getHistory();
    const nextEntry: HistoryEntry = {
      id: entry.id,
      title: entry.title,
      desc: entry.desc,
      url: entry.url,
      timestamp: entry.timestamp
    };
    const next = [nextEntry, ...history];
    await chrome.storage.local.set({ [HistoryService.key]: next });
    return next;
  }

  static async setHistory(entries: HistoryEntry[]): Promise<void> {
    const normalized = HistoryService.normalize(entries);
    const next = normalized.entries;
    await chrome.storage.local.set({ [HistoryService.key]: next });
  }

  static async deleteAt(index: number): Promise<HistoryEntry[]> {
    const history = await HistoryService.getHistory();
    const next = history.filter((_, i) => i !== index);
    await chrome.storage.local.set({ [HistoryService.key]: next });
    return next;
  }

  static async clear(): Promise<void> {
    await chrome.storage.local.set({ [HistoryService.key]: [] });
  }
}

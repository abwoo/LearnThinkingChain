import type { ExtensionState, ExternalMessage, MessagePayload, MessageResponse } from '../../src/messaging/Types';

type DebtBucket = {
  total_prompts: number;
  hidden_constraint_failures: number;
};

type SessionRecord = {
  id: string;
  topic: string;
  module: string;
  problem_type: string;
  started_at: number;
  last_event_at: number;
  total_prompts: number;
  hidden_constraint_failures: number;
};

type CognitiveProfile = {
  missed_points: string[];
  thinking_styles: string[];
  trial_error_history: string[];
  knowledge_gaps: string[];
  thinking_trend: string;
  meta_cognitive_level: number;
  hidden_constraint_failures: number;
  thinking_trend_counts: Record<string, number>;
  learning_debt: {
    hidden_constraint: number;
    by_topic: Record<string, DebtBucket>;
    by_module: Record<string, DebtBucket>;
    by_type: Record<string, DebtBucket>;
    sessions: SessionRecord[];
  };
  last_session_id: string;
  last_updated: number;
};

type ExtensionSettings = {
  session_gap_minutes: number;
  taxonomy: {
    topics: { label: string; keywords: string[] }[];
    modules: { label: string; keywords: string[] }[];
    types: { label: string; keywords: string[] }[];
  };
};

type ProtocolDefinition = Record<string, string>;

type StructuredResponse = {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  first_misstep: string;
  handover_question: string;
};

type ResponseRecord = {
  text: string;
  structured: StructuredResponse;
  mode: string;
  timestamp: number;
  topic: string;
  module: string;
  problem_type: string;
  archived?: boolean;
};

type HistoryEntry = {
  id: string;
  title: string;
  desc: string;
  url?: string;
  timestamp?: number;
};

type ThinkingFramework = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  isActive: boolean;
};

type ConnectionState = {
  ok: boolean;
  last_sync_at: number;
  last_error: string;
};

type FilterState = {
  mode: string;
  topic: string;
  module: string;
  problemType: string;
  showArchived: boolean;
};

const CloudHub = {
  state: {
    extensionId: '',
    currentView: 'control',
    active: false,
    mode: 'novice',
    hydrated: false,
    profile: {
      missed_points: [],
      thinking_styles: [],
      trial_error_history: [],
      knowledge_gaps: [],
      thinking_trend: '',
      meta_cognitive_level: 1,
      hidden_constraint_failures: 0,
      thinking_trend_counts: {},
      learning_debt: { hidden_constraint: 0, by_topic: {}, by_module: {}, by_type: {}, sessions: [] },
      last_session_id: '',
      last_updated: 0
    } as CognitiveProfile,
    history: [] as HistoryEntry[],
    frameworks: [] as ThinkingFramework[],
    selectedFrameworkId: '',
    theme: 'dark',
    protocols: {} as Record<string, ProtocolDefinition>,
    settings: {
      session_gap_minutes: 30,
      taxonomy: { topics: [], modules: [], types: [] }
    } as ExtensionSettings,
    latestResponse: null as ResponseRecord | null,
    responseHistory: [] as ResponseRecord[],
    connection: { ok: false, last_sync_at: 0, last_error: '' } as ConnectionState,
    filter: {
      mode: 'all',
      topic: 'all',
      module: 'all',
      problemType: 'all',
      showArchived: false
    } as FilterState
  },

  async init(): Promise<void> {
    this.state.extensionId = localStorage.getItem('ltc_extension_id') || '';
    this.state.theme = localStorage.getItem('ltc_theme') || 'dark';
    this.applyTheme(this.state.theme);

    const idInput = document.getElementById('extension-id-input') as HTMLInputElement | null;
    if (idInput) {
      idInput.value = this.state.extensionId;
      idInput.addEventListener('change', (event) => {
        const target = event.currentTarget as HTMLInputElement;
        this.state.extensionId = target.value.trim();
        localStorage.setItem('ltc_extension_id', this.state.extensionId);
        this.syncWithExtension();
      });
    }

    await this.syncWithExtension();
    this.bindEvents();
    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        if (changes.ltc_last_thinking_steps) {
          const steps = changes.ltc_last_thinking_steps.newValue;
          this.state.history = Array.isArray(steps) ? steps : [];
          this.renderHistory();
        }
      });
    }
    this.render();
  },

  async syncWithExtension(): Promise<void> {
    if (!this.state.extensionId) {
      this.updateConnection(false, 'No Extension ID');
      this.state.hydrated = false;
      this.render();
      return;
    }
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      this.updateConnection(false, 'Chrome runtime unavailable');
      this.state.hydrated = false;
      this.render();
      return;
    }

    chrome.runtime.sendMessage(this.state.extensionId, { type: 'GET_STATE' }, (response: ExtensionState | undefined) => {
      if (chrome.runtime.lastError) {
        this.updateConnection(false, chrome.runtime.lastError.message || 'Unknown error');
        this.state.hydrated = false;
        this.render();
        return;
      }
      if (response) {
        this.updateConnection(true, '');
        this.state.hydrated = true;
        this.state.active = response.ltc_active || false;
        this.state.mode = response.ltc_mode || 'novice';
        this.state.profile = this.normalizeProfile(response.ltc_profile);
        this.state.history = (response.ltc_last_thinking_steps || []) as HistoryEntry[];
        this.state.protocols = (response.ltc_protocols || {}) as unknown as Record<string, ProtocolDefinition>;
        this.state.frameworks = (response as { ltc_frameworks?: ThinkingFramework[] }).ltc_frameworks || [];
        this.ensureFrameworkSelection();
        this.state.settings = this.normalizeSettings(response.ltc_settings);
        this.state.latestResponse = response.ltc_latest_response || null;
        this.state.responseHistory = response.ltc_response_history || [];
        this.bindPushChannel();
        this.render();
        return;
      }
      this.state.hydrated = false;
      this.render();
    });
  },

  bindPushChannel(): void {
    if (!chrome.runtime?.onMessage) return;
    chrome.runtime.onMessage.addListener((message: ExternalMessage) => {
      if (message.type !== 'STATE_PUSH') return;
      const payload = message.payload;
      if (!payload) return;
      if (typeof payload.ltc_active === 'boolean') this.state.active = payload.ltc_active;
      if (payload.ltc_mode) this.state.mode = payload.ltc_mode;
      if (payload.ltc_last_thinking_steps) {
        this.state.history = payload.ltc_last_thinking_steps as HistoryEntry[];
      }
      if (payload.ltc_frameworks) {
        this.state.frameworks = payload.ltc_frameworks;
        this.ensureFrameworkSelection();
      }
      if (payload.ltc_latest_response) {
        this.state.latestResponse = payload.ltc_latest_response;
        this.state.responseHistory = [payload.ltc_latest_response, ...this.state.responseHistory].slice(0, 12);
      }
      this.updateConnection(true, '');
      this.state.hydrated = true;
      this.render();
    });
  },

  updateConnection(ok: boolean, error: string): void {
    this.state.connection.ok = ok;
    this.state.connection.last_error = error;
    this.state.connection.last_sync_at = Date.now();
  },

  bindEvents(): void {
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLElement;
        const view = target.dataset.view || 'control';
        this.switchView(view);
      });
    });

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const nextTheme = this.state.theme === 'dark' ? 'light' : 'dark';
      this.applyTheme(nextTheme);
    });

    document.getElementById('add-gap-btn')?.addEventListener('click', () => {
      const input = document.getElementById('new-gap-input') as HTMLInputElement | null;
      if (!input) return;
      const val = input.value.trim();
      if (!val || !this.state.extensionId) return;
      this.state.profile.missed_points.push(val);
      this.state.profile.knowledge_gaps.push(val);
      this.sendToExtension({ type: 'SAVE_PROFILE', profile: this.state.profile });
      this.renderKnowledgeGaps();
      input.value = '';
    });

    document.getElementById('reset-profile')?.addEventListener('click', () => {
      if (!this.state.extensionId) return;
      if (confirm('WARNING: Wipe all cognitive memory?')) {
        this.sendToExtension({ type: 'WIPE_MEMORY' });
      }
    });

    document.getElementById('save-settings')?.addEventListener('click', () => {
      const input = document.getElementById('session-gap-input') as HTMLInputElement | null;
      if (!input) return;
      const minutes = Number.parseInt(input.value, 10);
      const safeValue = Number.isFinite(minutes) ? Math.max(5, Math.min(180, minutes)) : 30;
      this.state.settings.session_gap_minutes = safeValue;
      this.sendToExtension({ type: 'SAVE_SETTINGS', settings: this.state.settings });
      input.value = String(safeValue);
    });

    document.getElementById('save-protocols')?.addEventListener('click', () => {
      const editor = document.getElementById('protocol-json-editor') as HTMLTextAreaElement | null;
      const status = document.getElementById('protocol-save-status');
      if (!editor) return;
      try {
        const parsed = JSON.parse(editor.value || '{}');
        this.sendToExtension({ type: 'SAVE_PROTOCOLS', protocols: parsed });
        editor.dataset.dirty = 'false';
        if (status) status.textContent = '已同步到扩展';
      } catch {
        if (status) status.textContent = 'JSON 格式错误';
      }
    });

    document.getElementById('save-taxonomy')?.addEventListener('click', () => {
      const editor = document.getElementById('taxonomy-json-editor') as HTMLTextAreaElement | null;
      const status = document.getElementById('taxonomy-save-status');
      if (!editor) return;
      try {
        const parsed = JSON.parse(editor.value || '{}');
        this.state.settings.taxonomy = parsed;
        this.sendToExtension({ type: 'SAVE_SETTINGS', settings: this.state.settings });
        editor.dataset.dirty = 'false';
        if (status) status.textContent = '已同步到扩展';
      } catch {
        if (status) status.textContent = 'JSON 格式错误';
      }
    });

    document.getElementById('inc-hidden-constraint')?.addEventListener('click', () => {
      this.state.profile.hidden_constraint_failures += 1;
      this.state.profile.learning_debt.hidden_constraint = this.state.profile.hidden_constraint_failures;
      this.sendToExtension({ type: 'SAVE_PROFILE', profile: this.state.profile });
      this.renderLearningDebtDetails();
    });

    document.getElementById('reset-learning-debt')?.addEventListener('click', () => {
      this.state.profile.hidden_constraint_failures = 0;
      this.state.profile.learning_debt.hidden_constraint = 0;
      this.state.profile.learning_debt.by_topic = {};
      this.state.profile.learning_debt.by_module = {};
      this.state.profile.learning_debt.by_type = {};
      this.state.profile.learning_debt.sessions = [];
      this.sendToExtension({ type: 'SAVE_PROFILE', profile: this.state.profile });
      this.renderLearningDebtDetails();
    });

    document.getElementById('preview-test-input')?.addEventListener('input', (event) => {
      const target = event.currentTarget as HTMLTextAreaElement;
      this.updatePreview(target.value);
    });

    document.getElementById('protocol-json-editor')?.addEventListener('input', (event) => {
      (event.currentTarget as HTMLTextAreaElement).dataset.dirty = 'true';
    });

    document.getElementById('taxonomy-json-editor')?.addEventListener('input', (event) => {
      (event.currentTarget as HTMLTextAreaElement).dataset.dirty = 'true';
    });

    document.getElementById('filter-mode')?.addEventListener('change', (event) => {
      const target = event.currentTarget as HTMLSelectElement;
      this.state.filter.mode = target.value;
      this.renderResearchCards();
    });
    document.getElementById('filter-topic')?.addEventListener('change', (event) => {
      const target = event.currentTarget as HTMLSelectElement;
      this.state.filter.topic = target.value;
      this.renderResearchCards();
    });
    document.getElementById('filter-module')?.addEventListener('change', (event) => {
      const target = event.currentTarget as HTMLSelectElement;
      this.state.filter.module = target.value;
      this.renderResearchCards();
    });
    document.getElementById('filter-type')?.addEventListener('change', (event) => {
      const target = event.currentTarget as HTMLSelectElement;
      this.state.filter.problemType = target.value;
      this.renderResearchCards();
    });
    document.getElementById('filter-archived')?.addEventListener('change', (event) => {
      const target = event.currentTarget as HTMLInputElement;
      this.state.filter.showArchived = target.checked;
      this.renderResearchCards();
    });

    document.getElementById('framework-add')?.addEventListener('click', () => {
      const id = `fw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const draft: ThinkingFramework = {
        id,
        name: 'New Framework',
        description: '',
        systemPrompt: '请输入系统提示词模板，必须包含 {{userInput}}',
        isActive: false
      };
      this.state.frameworks = [draft, ...this.state.frameworks];
      this.state.selectedFrameworkId = id;
      this.renderFrameworkManager();
    });

    document.getElementById('framework-save')?.addEventListener('click', () => {
      const framework = this.collectFrameworkInput();
      if (!framework) return;
      this.sendToExtension({ type: 'SAVE_FRAMEWORK', framework });
      this.state.frameworks = this.upsertFramework(framework);
      this.ensureFrameworkSelection();
      this.renderFrameworkManager();
      this.updateFrameworkStatus('已同步');
    });

    document.getElementById('framework-delete')?.addEventListener('click', () => {
      const selected = this.getSelectedFramework();
      if (!selected) return;
      if (!confirm(`确认删除框架 "${selected.name}"?`)) return;
      this.sendToExtension({ type: 'DELETE_FRAMEWORK', frameworkId: selected.id });
      this.state.frameworks = this.state.frameworks.filter((f) => f.id !== selected.id);
      this.ensureFrameworkSelection();
      this.renderFrameworkManager();
      this.updateFrameworkStatus('已同步');
    });

    document.getElementById('framework-set-active')?.addEventListener('click', () => {
      const selected = this.getSelectedFramework();
      if (!selected) return;
      this.sendToExtension({ type: 'SET_ACTIVE_FRAMEWORK', frameworkId: selected.id });
      this.state.frameworks = this.state.frameworks.map((f) => ({
        ...f,
        isActive: f.id === selected.id
      }));
      this.renderFrameworkManager();
      this.updateFrameworkStatus('已同步');
    });
  },

  sendToExtension(message: MessagePayload): void {
    if (!chrome.runtime?.sendMessage || !this.state.extensionId) return;
    chrome.runtime.sendMessage(this.state.extensionId, message, (response: MessageResponse | undefined) => {
      if (response && response.success) {
        this.syncWithExtension();
      }
    });
  },

  saveProfile(): void {
    this.sendToExtension({ type: 'SAVE_PROFILE', profile: this.state.profile });
  },

  ensureFrameworkSelection(): void {
    if (this.state.frameworks.length === 0) {
      this.state.selectedFrameworkId = '';
      return;
    }
    const active = this.state.frameworks.find((f) => f.isActive);
    if (active) {
      this.state.selectedFrameworkId = active.id;
      return;
    }
    if (!this.state.selectedFrameworkId) {
      this.state.selectedFrameworkId = this.state.frameworks[0].id;
    }
  },

  getSelectedFramework(): ThinkingFramework | null {
    return this.state.frameworks.find((f) => f.id === this.state.selectedFrameworkId) || null;
  },

  upsertFramework(framework: ThinkingFramework): ThinkingFramework[] {
    const index = this.state.frameworks.findIndex((f) => f.id === framework.id);
    if (index >= 0) {
      const next = [...this.state.frameworks];
      next[index] = framework;
      return next;
    }
    return [framework, ...this.state.frameworks];
  },

  collectFrameworkInput(): ThinkingFramework | null {
    const selected = this.getSelectedFramework();
    const nameInput = document.getElementById('framework-name') as HTMLInputElement | null;
    const descInput = document.getElementById('framework-description') as HTMLTextAreaElement | null;
    const promptInput = document.getElementById('framework-prompt') as HTMLTextAreaElement | null;
    if (!nameInput || !descInput || !promptInput) return null;
    const id = selected?.id || `fw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      id,
      name: nameInput.value.trim() || 'Untitled Framework',
      description: descInput.value.trim(),
      systemPrompt: promptInput.value,
      isActive: selected?.isActive ?? false
    };
  },

  updateFrameworkStatus(text: string): void {
    const status = document.getElementById('framework-status');
    if (status) status.textContent = text;
  },

  switchView(viewId: string): void {
    this.state.currentView = viewId;
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach((link) => link.classList.remove('active'));
    document.getElementById(`${viewId}-view`)?.classList.add('active');
    document.querySelector(`[data-view="${viewId}"]`)?.classList.add('active');
  },

  updatePreview(rawInput: string): void {
    const p = this.getProtocolForMode();
    const codeBox = document.getElementById('current-protocol-code');
    if (!codeBox) return;
    codeBox.textContent = `# LearnThinkingChain Preview
[Mode] ${this.state.mode.toUpperCase()}
[Identity] ${p.identity || 'Peer Learner'}
[Focus] ${p.focus || ''}

Q1: ${p.q1_blind_spot || p.q1}
Q2: ${p.q2_entropy || p.q2}
Q3: ${p.q3_backtrack || p.q3}
Q4: ${p.q4_handover || p.q4}

[Thinking Path Map]
Start -> Wrong Turn -> Insight -> Target

[User Memory]
${JSON.stringify(this.state.profile, null, 2)}

[Prompt]
${rawInput}`;
  },

  getFallbackProtocols(): Record<string, Record<string, string>> {
    return {
      novice: {
        identity: 'Peer Learner',
        focus: 'Explain like a peer who is still learning.',
        q1: 'Simulate a beginner\'s blind spot and surface the most misleading cue.',
        q2: 'Walk the naive path and show where it breaks.',
        q3: 'Backtrack to the missing definition or constraint.',
        q4: 'Give direction, end with an open question.'
      }
    };
  },

  getProtocolForMode(): ProtocolDefinition {
    const fallback = this.getFallbackProtocols();
    const custom = this.state.protocols || {};
    return custom[this.state.mode] || fallback[this.state.mode] || fallback.novice;
  },

  render(): void {
    if (!this.state.hydrated) {
      this.renderEmptyState(this.state.connection.last_error || 'Waiting for Extension data...');
      this.renderStats();
      return;
    }
    this.renderHistory();
    this.renderStats();
    this.renderFrameworkManager();
    this.renderKnowledgeGaps();
    this.renderLearningDebtDetails();
    this.renderResearchPanel();
    this.renderResearchCards();
    this.renderTimeline();
    this.renderFilters();
    const modeEl = document.getElementById('active-mode');
    if (modeEl) modeEl.textContent = this.state.mode.toUpperCase();
  },

  renderEmptyState(reason: string): void {
    const emptyHtml = `<div class="dim">${reason}</div>`;
    const chain = document.getElementById('live-chain');
    if (chain) chain.innerHTML = emptyHtml;
    const panel = document.getElementById('q4-research-panel');
    if (panel) panel.innerHTML = emptyHtml;
    const cards = document.getElementById('research-cards');
    if (cards) cards.innerHTML = emptyHtml;
    const timeline = document.getElementById('session-timeline');
    if (timeline) timeline.innerHTML = emptyHtml;
    const sessions = document.getElementById('learning-debt-sessions');
    if (sessions) sessions.innerHTML = emptyHtml;
    const modeEl = document.getElementById('active-mode');
    if (modeEl) modeEl.textContent = '—';
  },

  renderHistory(): void {
    const chain = document.getElementById('live-chain');
    if (!chain) return;
    chain.innerHTML = this.state.history.length > 0 ? '' : '<p class="dim">No active pulse detected...</p>';
    this.state.history.forEach((step) => {
      const stepDiv = document.createElement('div');
      stepDiv.className = 'chain-step glass animate-in history-item';
      stepDiv.style.padding = '15px';
      stepDiv.style.marginBottom = '10px';
      const hasLongDesc = step.desc && step.desc.length > 120;
      stepDiv.innerHTML = `
        <strong>${step.title}</strong>
        <div class="history-desc">${step.desc}</div>
        <div class="history-actions">
          ${step.url ? `<button class="history-link" data-url="${step.url}">跳转对话</button>` : ''}
          ${hasLongDesc ? `<button class="history-toggle">展开</button>` : ''}
          <button class="history-delete" data-id="${step.id}">删除</button>
        </div>
      `;
      chain.appendChild(stepDiv);
    });

    chain.querySelectorAll('.history-link').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const target = event.currentTarget as HTMLButtonElement;
        const url = target.dataset.url;
        if (url) window.open(url, '_blank');
      });
    });

    chain.querySelectorAll('.history-toggle').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const target = event.currentTarget as HTMLButtonElement;
        const item = target.closest('.history-item');
        if (item) {
          item.classList.toggle('expanded');
          target.textContent = item.classList.contains('expanded') ? '收起' : '展开';
        }
      });
    });

    chain.querySelectorAll('.history-delete').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const target = event.currentTarget as HTMLButtonElement;
        const id = target.dataset.id;
        if (id) this.deleteHistoryById(id);
      });
    });
  },

  deleteHistoryById(id: string): void {
    this.state.history = this.state.history.filter((item) => item.id !== id);
    this.sendToExtension({ type: 'DELETE_HISTORY', historyId: id });
    this.renderHistory();
  },

  renderFrameworkManager(): void {
    const list = document.getElementById('framework-list');
    if (!list) return;
    list.innerHTML = '';
    if (this.state.frameworks.length === 0) {
      list.innerHTML = '<div class="dim">暂无框架</div>';
      return;
    }

    this.state.frameworks.forEach((framework) => {
      const item = document.createElement('div');
      item.className = `framework-item ${framework.isActive ? 'active' : ''}`;
      item.innerHTML = `
        <div class="framework-meta">
          <strong>${framework.name}</strong>
          <span>${framework.description || '无描述'}</span>
        </div>
        <div>${framework.isActive ? 'ACTIVE' : ''}</div>
      `;
      item.addEventListener('click', () => {
        this.state.selectedFrameworkId = framework.id;
        this.renderFrameworkManager();
      });
      list.appendChild(item);
    });

    const selected = this.getSelectedFramework();
    const nameInput = document.getElementById('framework-name') as HTMLInputElement | null;
    const descInput = document.getElementById('framework-description') as HTMLTextAreaElement | null;
    const promptInput = document.getElementById('framework-prompt') as HTMLTextAreaElement | null;
    if (!nameInput || !descInput || !promptInput) return;

    if (!selected) {
      nameInput.value = '';
      descInput.value = '';
      promptInput.value = '';
      return;
    }

    nameInput.value = selected.name;
    descInput.value = selected.description;
    promptInput.value = selected.systemPrompt;
  },

  renderStats(): void {
    document.querySelectorAll('.learning-debt-count').forEach((el) => {
      el.textContent = String(this.state.profile.learning_debt?.hidden_constraint || 0);
    });
    document.querySelectorAll('.hidden-constraint-count').forEach((el) => {
      el.textContent = String(this.state.profile.hidden_constraint_failures || 0);
    });

    const trendEl = document.getElementById('thinking-trend');
    if (trendEl) trendEl.textContent = this.state.profile.thinking_trend || '—';

    const statusEl = document.getElementById('active-status');
    if (statusEl) {
      statusEl.textContent = this.state.active ? 'ON' : 'OFF';
      statusEl.classList.toggle('status-on', this.state.active);
      statusEl.classList.toggle('status-off', !this.state.active);
    }

    const connectionEl = document.getElementById('connection-status');
    if (connectionEl) {
      connectionEl.textContent = this.state.connection.ok ? 'CONNECTED' : 'DISCONNECTED';
      connectionEl.classList.toggle('status-on', this.state.connection.ok);
      connectionEl.classList.toggle('status-off', !this.state.connection.ok);
      connectionEl.title = this.state.connection.last_error || '';
    }

    const lastSyncEl = document.getElementById('last-sync');
    if (lastSyncEl) {
      lastSyncEl.textContent = this.state.connection.last_sync_at
        ? new Date(this.state.connection.last_sync_at).toLocaleTimeString()
        : '--';
    }

    const gapInput = document.getElementById('session-gap-input') as HTMLInputElement | null;
    if (gapInput && this.state.settings?.session_gap_minutes) {
      gapInput.value = String(this.state.settings.session_gap_minutes);
    }
  },

  renderKnowledgeGaps(): void {
    const list = document.getElementById('gaps-list');
    if (list) {
      list.innerHTML = '';
      this.state.profile.missed_points.forEach((gap, i) => {
        const li = document.createElement('li');
        li.className = 'tag-interactive animate-in';
        li.innerHTML = `${gap} <span class="remove" data-index="${i}">×</span>`;
        list.appendChild(li);
      });
      list.querySelectorAll('.remove').forEach((btn) => {
        (btn as HTMLElement).onclick = (event: MouseEvent) => {
          const target = event.currentTarget as HTMLElement;
          const index = Number(target.dataset.index || 0);
          this.deleteTag(index);
        };
      });
    }

    const knowledgeEl = document.getElementById('knowledge-gaps');
    if (knowledgeEl) {
      knowledgeEl.innerHTML = '';
      const gaps = this.state.profile.knowledge_gaps || [];
      gaps.forEach((gap) => {
        const tag = document.createElement('span');
        tag.className = 'tag-chip';
        tag.innerText = gap;
        knowledgeEl.appendChild(tag);
      });
      if (gaps.length === 0) knowledgeEl.innerHTML = '<span class="dim">尚无记录</span>';
    }

    const detailed = document.getElementById('knowledge-gaps-detailed');
    if (!detailed) return;
    const gaps = this.state.profile.knowledge_gaps || [];
    if (gaps.length === 0) {
      detailed.innerHTML = '<div class="dim">暂无知识锚点</div>';
      return;
    }
    const counts = gaps.reduce<Record<string, number>>((acc, gap) => {
      acc[gap] = (acc[gap] || 0) + 1;
      return acc;
    }, {});
    detailed.innerHTML = Object.keys(counts)
      .map(
        (gap) => `
        <div class="anchor-item">
          <span class="anchor-name">${gap}</span>
          <span class="anchor-count">${counts[gap]}</span>
        </div>
      `
      )
      .join('');
  },

  deleteTag(index: number): void {
    if (!Number.isFinite(index)) return;
    this.state.profile.missed_points.splice(index, 1);
    this.state.profile.knowledge_gaps = this.state.profile.missed_points.slice();
    this.saveProfile();
    this.renderKnowledgeGaps();
  },

  renderLearningDebtDetails(): void {
    this.renderDebtList('learning-debt-topics', this.state.profile.learning_debt?.by_topic, '暂无题目类型统计');
    this.renderDebtList('learning-debt-modules', this.state.profile.learning_debt?.by_module, '暂无知识模块统计');
    this.renderDebtList('learning-debt-types', this.state.profile.learning_debt?.by_type, '暂无题目类型统计');

    const sessionList = document.getElementById('learning-debt-sessions');
    if (sessionList) {
      const sessions = this.state.profile.learning_debt?.sessions || [];
      sessionList.innerHTML = sessions.length
        ? sessions
            .slice(0, 6)
            .map(
              (session) => `
              <div class="debt-row">
                <span>${session.topic || 'general'} · ${session.module || 'general'}</span>
                <span>${session.hidden_constraint_failures}/${session.total_prompts}</span>
              </div>
            `
            )
            .join('')
        : '<div class="dim">暂无会话统计</div>';
    }
    this.renderDebtCurve();
  },

  renderDebtList(elementId: string, data: Record<string, DebtBucket>, emptyText: string): void {
    const container = document.getElementById(elementId);
    if (!container) return;
    const entries = data ? Object.keys(data) : [];
    if (!entries.length) {
      container.innerHTML = `<div class="dim">${emptyText}</div>`;
      return;
    }
    container.innerHTML = entries
      .map(
        (key) => `
        <div class="debt-row">
          <span>${key}</span>
          <span>${data[key].hidden_constraint_failures}/${data[key].total_prompts}</span>
        </div>
      `
      )
      .join('');
  },

  renderDebtCurve(): void {
    const svg = document.getElementById('learning-progress-curve') as SVGSVGElement | null;
    if (!svg) return;
    const sessions = (this.state.profile.learning_debt?.sessions || []).slice(0, 10).reverse();
    if (!sessions.length) {
      svg.innerHTML = '';
      return;
    }
    const ns = 'http://www.w3.org/2000/svg';
    const width = 300;
    const height = 120;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '';
    const points = sessions
      .map((session, index) => {
        const ratio = session.total_prompts ? session.hidden_constraint_failures / session.total_prompts : 0;
        const progress = Math.max(0, 1 - ratio);
        const x = 20 + (index * (width - 40)) / Math.max(1, sessions.length - 1);
        const y = height - 20 - progress * (height - 40);
        return `${x},${y}`;
      })
      .join(' ');
    const polyline = document.createElementNS(ns, 'polyline');
    polyline.setAttribute('points', points);
    polyline.setAttribute('class', 'curve-line');
    svg.appendChild(polyline);
  },

  renderResearchPanel(): void {
    const panel = document.getElementById('q4-research-panel');
    if (!panel) return;
    const latest = this.state.latestResponse;
    const parsed = latest?.structured || this.parseFramework(latest?.text || '');
    panel.innerHTML = `
      <div class="research-card"><div class="research-title">Q1 认知盲区</div><div class="research-body">${parsed.q1 || '—'}</div></div>
      <div class="research-card"><div class="research-title">Q2 试错模拟</div><div class="research-body">${parsed.q2 || '—'}</div></div>
      <div class="research-card"><div class="research-title">Q3 底层回溯</div><div class="research-body">${parsed.q3 || '—'}</div></div>
      <div class="research-card"><div class="research-title">Q4 认知交接</div><div class="research-body">${parsed.q4 || '—'}</div></div>
      <div class="research-card"><div class="research-title">误区</div><div class="research-body">${parsed.first_misstep || '—'}</div></div>
      <div class="research-card"><div class="research-title">追问</div><div class="research-body">${parsed.handover_question || '—'}</div></div>
    `;
  },

  renderResearchCards(): void {
    const container = document.getElementById('research-cards');
    if (!container) return;
    const items = this.applyFilters(this.state.responseHistory);
    if (!items.length) {
      container.innerHTML = '<div class="dim">暂无研究卡片</div>';
      return;
    }
    container.innerHTML = items
      .slice(0, 8)
      .map((item) => {
        const structured = item.structured || this.parseFramework(item.text || '');
        const meta = `${item.topic || 'general'} / ${item.module || 'general'} / ${item.problem_type || 'general'}`;
        return `
          <div class="research-tile" data-ts="${item.timestamp}">
            <div class="tile-header">
              <span>${new Date(item.timestamp).toLocaleTimeString()}</span>
              <span>${item.mode || 'novice'}</span>
            </div>
            <div class="tile-meta">${meta}</div>
            <div class="tile-body">
              <div><strong>Q1</strong> ${structured.q1 || '—'}</div>
              <div><strong>Q2</strong> ${structured.q2 || '—'}</div>
              <div><strong>Q3</strong> ${structured.q3 || '—'}</div>
              <div><strong>Q4</strong> ${structured.q4 || '—'}</div>
            </div>
            <div class="tile-actions">
              <button class="btn-glass btn-small" data-action="toggle">展开</button>
              <button class="btn-glass btn-small" data-action="archive">归档</button>
            </div>
            <div class="tile-detail">${item.text}</div>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('.research-tile').forEach((tile) => {
      const timestamp = Number((tile as HTMLElement).dataset.ts);
      tile.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const action = target.dataset.action;
        if (!action) return;
        if (action === 'toggle') {
          tile.classList.toggle('expanded');
          return;
        }
        if (action === 'archive') {
          this.toggleArchive(timestamp);
        }
      });
    });
  },

  renderFilters(): void {
    const modeSelect = document.getElementById('filter-mode') as HTMLSelectElement | null;
    const topicSelect = document.getElementById('filter-topic') as HTMLSelectElement | null;
    const moduleSelect = document.getElementById('filter-module') as HTMLSelectElement | null;
    const typeSelect = document.getElementById('filter-type') as HTMLSelectElement | null;
    if (!modeSelect || !topicSelect || !moduleSelect || !typeSelect) return;

    const modes = Array.from(new Set(this.state.responseHistory.map((item) => item.mode))).filter(Boolean);
    const topics = Array.from(new Set(this.state.responseHistory.map((item) => item.topic))).filter(Boolean);
    const modules = Array.from(new Set(this.state.responseHistory.map((item) => item.module))).filter(Boolean);
    const types = Array.from(new Set(this.state.responseHistory.map((item) => item.problem_type))).filter(Boolean);

    populateSelect(modeSelect, modes, '全部模式', this.state.filter.mode);
    populateSelect(topicSelect, topics, '全部题目', this.state.filter.topic);
    populateSelect(moduleSelect, modules, '全部模块', this.state.filter.module);
    populateSelect(typeSelect, types, '全部类型', this.state.filter.problemType);
  },

  renderTimeline(): void {
    const container = document.getElementById('session-timeline');
    if (!container) return;
    const sessions = (this.state.profile.learning_debt?.sessions || []).slice(0, 10);
    if (!sessions.length) {
      container.innerHTML = '<div class="dim">暂无会话记录</div>';
      return;
    }
    container.innerHTML = sessions
      .map((session) => {
        const ratio = session.total_prompts ? session.hidden_constraint_failures / session.total_prompts : 0;
        const progress = Math.max(0, 1 - ratio);
        const percent = Math.round(progress * 100);
        return `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-title">${session.topic || 'general'} · ${session.module || 'general'} · ${session.problem_type || 'general'}</div>
            <div class="timeline-meta">${new Date(session.started_at).toLocaleTimeString()} · 进度 ${percent}%</div>
            <div class="timeline-bar">
              <div class="timeline-bar-fill" style="width:${percent}%"></div>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  },

  parseFramework(text: string): StructuredResponse {
    const result: StructuredResponse = { q1: '', q2: '', q3: '', q4: '', first_misstep: '', handover_question: '' };
    if (!text) return result;
    const sections = text.split(/\n+/);
    sections.forEach((line) => {
      if (/Q1/i.test(line)) result.q1 = line.replace(/Q1[:：]?\s*/i, '').trim();
      if (/Q2/i.test(line)) result.q2 = line.replace(/Q2[:：]?\s*/i, '').trim();
      if (/Q3/i.test(line)) result.q3 = line.replace(/Q3[:：]?\s*/i, '').trim();
      if (/Q4/i.test(line)) result.q4 = line.replace(/Q4[:：]?\s*/i, '').trim();
      if (line.startsWith('我最初以为')) result.first_misstep = line.trim();
    });
    const lastQuestion = sections.slice().reverse().find((line) => line.endsWith('？') || line.endsWith('?'));
    result.handover_question = lastQuestion || '';
    return result;
  },

  normalizeProfile(profile?: CognitiveProfile): CognitiveProfile {
    const base: CognitiveProfile = {
      missed_points: [],
      thinking_styles: [],
      trial_error_history: [],
      knowledge_gaps: [],
      thinking_trend: '',
      meta_cognitive_level: 1,
      hidden_constraint_failures: 0,
      thinking_trend_counts: {},
      learning_debt: { hidden_constraint: 0, by_topic: {}, by_module: {}, by_type: {}, sessions: [] },
      last_session_id: '',
      last_updated: 0
    };
    return { ...base, ...(profile ?? {}) };
  },

  normalizeSettings(settings?: ExtensionSettings): ExtensionSettings {
    const base: ExtensionSettings = { session_gap_minutes: 30, taxonomy: { topics: [], modules: [], types: [] } };
    return { ...base, ...(settings ?? {}) };
  },

  refreshProtocolEditor(): void {
    const editor = document.getElementById('protocol-json-editor') as HTMLTextAreaElement | null;
    if (!editor || editor.dataset.dirty === 'true') return;
    editor.value = JSON.stringify(this.state.protocols || {}, null, 2);
    editor.dataset.dirty = 'false';
    const status = document.getElementById('protocol-save-status');
    if (status) status.textContent = '已同步';
  },

  refreshTaxonomyEditor(): void {
    const editor = document.getElementById('taxonomy-json-editor') as HTMLTextAreaElement | null;
    if (!editor || editor.dataset.dirty === 'true') return;
    editor.value = JSON.stringify(this.state.settings.taxonomy || {}, null, 2);
    editor.dataset.dirty = 'false';
    const status = document.getElementById('taxonomy-save-status');
    if (status) status.textContent = '已同步';
  },

  toggleArchive(timestamp: number): void {
    this.state.responseHistory = this.state.responseHistory.map((item) =>
      item.timestamp === timestamp ? { ...item, archived: !item.archived } : item
    );
    this.renderResearchCards();
  },

  applyFilters(items: ResponseRecord[]): ResponseRecord[] {
    return items.filter((item) => {
      if (!this.state.filter.showArchived && item.archived) return false;
      if (this.state.filter.mode !== 'all' && item.mode !== this.state.filter.mode) return false;
      if (this.state.filter.topic !== 'all' && item.topic !== this.state.filter.topic) return false;
      if (this.state.filter.module !== 'all' && item.module !== this.state.filter.module) return false;
      if (this.state.filter.problemType !== 'all' && item.problem_type !== this.state.filter.problemType) return false;
      return true;
    });
  },

  applyTheme(theme: string): void {
    this.state.theme = theme;
    localStorage.setItem('ltc_theme', theme);
    document.body.classList.toggle('theme-light', theme === 'light');
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.textContent = theme === 'light' ? '☀️' : '🌙';
  }
};

function populateSelect(select: HTMLSelectElement, values: string[], label: string, current: string): void {
  select.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = 'all';
  defaultOption.textContent = label;
  select.appendChild(defaultOption);
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.value = current;
}

document.addEventListener('DOMContentLoaded', () => {
  CloudHub.init();
});

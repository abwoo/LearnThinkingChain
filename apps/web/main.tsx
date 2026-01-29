import type { ExtensionState, ExternalMessage, MessagePayload, MessageResponse } from '../../src/messaging/Types';
import type { FrameworkEntry } from '../../src/core/services/FrameworkService';

const FrameworkBoard = {
  state: {
    extensionId: '',
    connected: false,
    frameworks: [] as FrameworkEntry[]
  },

  async init(): Promise<void> {
    this.state.extensionId = localStorage.getItem('ltc_extension_id') || '';
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

    document.getElementById('add-framework-btn')?.addEventListener('click', () => {
      this.addFramework();
    });

    this.bindPushChannel();
    await this.syncWithExtension();
    this.render();
  },

  async syncWithExtension(): Promise<void> {
    if (!this.state.extensionId) {
      this.state.connected = false;
      this.render();
      return;
    }
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      this.state.connected = false;
      this.render();
      return;
    }

    chrome.runtime.sendMessage(this.state.extensionId, { type: 'GET_STATE' }, (response: ExtensionState | undefined) => {
      if (chrome.runtime.lastError || !response) {
        this.state.connected = false;
        this.render();
        return;
      }
      this.state.connected = true;
      this.state.frameworks = response.ltc_frameworks || [];
      this.render();
    });
  },

  bindPushChannel(): void {
    if (!chrome.runtime?.onMessage) return;
    chrome.runtime.onMessage.addListener((message: ExternalMessage) => {
      if (message.type !== 'STATE_PUSH') return;
      const payload = message.payload;
      if (!payload || !payload.ltc_frameworks) return;
      this.state.frameworks = payload.ltc_frameworks;
      this.state.connected = true;
      this.render();
    });
  },

  addFramework(): void {
    const input = document.getElementById('framework-input') as HTMLInputElement | null;
    if (!input) return;
    const name = input.value.trim();
    if (!name || !this.state.extensionId) return;
    this.sendToExtension({ type: 'FRAMEWORK_ADD', frameworkName: name });
    input.value = '';
  },

  deleteFramework(id: string): void {
    if (!this.state.extensionId) return;
    this.sendToExtension({ type: 'FRAMEWORK_DELETE', frameworkId: id });
  },

  sendToExtension(message: MessagePayload): void {
    if (!chrome.runtime?.sendMessage || !this.state.extensionId) return;
    chrome.runtime.sendMessage(this.state.extensionId, message, (_response: MessageResponse | undefined) => {
      this.syncWithExtension();
    });
  },

  render(): void {
    const status = document.getElementById('connection-status');
    if (status) {
      status.textContent = this.state.connected ? 'CONNECTED' : 'DISCONNECTED';
      status.classList.toggle('status-on', this.state.connected);
      status.classList.toggle('status-off', !this.state.connected);
    }

    const list = document.getElementById('framework-list');
    if (!list) return;
    if (!this.state.frameworks.length) {
      list.innerHTML = '<div class="dim">暂无框架，请在上方输入并添加</div>';
      return;
    }
    list.innerHTML = this.state.frameworks
      .map((item) => `
        <div class="framework-row">
          <span>${item.name}</span>
          <button class="btn-glass btn-small" data-id="${item.id}">删除</button>
        </div>
      `)
      .join('');
    list.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLElement;
        const id = target.dataset.id || '';
        if (id) this.deleteFramework(id);
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  FrameworkBoard.init();
});

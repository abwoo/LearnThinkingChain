/**
 * LearnThinkingChain - Cognitive Hub v4 (Web App Core)
 * This version supports communicating with the local extension FROM the cloud (github.io).
 */

const CloudHub = {
    state: {
        extensionId: '',
        currentView: 'control',
        active: false,
        mode: 'novice',
        profile: { missed_points: [], thinking_styles: [] },
        history: []
    },

    async init() {
        console.log("[LTC Hub] Initializing...");

        // Load saved extension ID from localStorage (browser-native)
        this.state.extensionId = localStorage.getItem('ltc_extension_id') || '';
        const idInput = document.getElementById('extension-id-input');
        if (idInput) {
            idInput.value = this.state.extensionId;
            idInput.addEventListener('change', (e) => {
                this.state.extensionId = e.target.value.trim();
                localStorage.setItem('ltc_extension_id', this.state.extensionId);
                this.syncWithExtension();
            });
        }

        await this.syncWithExtension();
        this.bindEvents();
        this.render();

        // Polling sync for cloud demo
        setInterval(() => this.syncWithExtension(), 3000);
    },

    async syncWithExtension() {
        if (!this.state.extensionId) {
            console.warn("[LTC Hub] No Extension ID set. Sync disabled.");
            return;
        }

        // Use chrome.runtime.sendMessage for externally_connectable communication
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(this.state.extensionId, { type: "GET_STATE" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("[LTC Hub] Connection failed:", chrome.runtime.lastError.message);
                    return;
                }
                if (response) {
                    this.state.active = response.ltc_active || false;
                    this.state.mode = response.ltc_mode || 'novice';
                    this.state.profile = response.ltc_profile || { missed_points: [], thinking_styles: [] };
                    this.state.history = response.ltc_last_thinking_steps || [];
                    this.render();
                }
            });
        }
    },

    bindEvents() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.view;
                this.switchView(target);
            });
        });

        document.getElementById('add-gap-btn')?.addEventListener('click', () => {
            const input = document.getElementById('new-gap-input');
            const val = input.value.trim();
            if (val && this.state.extensionId) {
                this.state.profile.missed_points.push(val);
                this.sendToExtension({ type: "SAVE_PROFILE", profile: this.state.profile });
                input.value = '';
            }
        });

        document.getElementById('preview-test-input')?.addEventListener('input', (e) => {
            this.updatePreview(e.target.value);
        });

        document.getElementById('reset-profile')?.addEventListener('click', () => {
            if (confirm("WARNING: Wipe all cognitive memory?") && this.state.extensionId) {
                this.sendToExtension({ type: "WIPE_MEMORY" });
            }
        });
    },

    sendToExtension(message) {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage && this.state.extensionId) {
            chrome.runtime.sendMessage(this.state.extensionId, message, (response) => {
                if (response && response.success) {
                    this.syncWithExtension();
                }
            });
        }
    },

    switchView(viewId) {
        this.state.currentView = viewId;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

        document.getElementById(`${viewId}-view`)?.classList.add('active');
        document.querySelector(`[data-view="${viewId}"]`)?.classList.add('active');
    },

    updatePreview(rawInput) {
        const protocols = {
            'novice': '[IDENTITY: Peer Learner]\n1. Initial Overwhelm\n2. Noise/Intuition\n3. Trial & Error\n4. Meta-Shift',
            'socratic': '[IDENTITY: Socratic Mentor]\n1. No direct answers\n2. Guiding counter-questions',
            'first_principles': '[IDENTITY: First-Principles]\n1. Atomize facts\n2. Rebuild logically',
            'analogy': '[IDENTITY: Analogy Artist]\n1. Map to daily life\n2. Bridge back'
        };
        const template = protocols[this.state.mode] || protocols.novice;
        const codeBox = document.getElementById('current-protocol-code');
        if (codeBox) {
            codeBox.innerText = `${template}\n\n[USER MEMORY]\n${JSON.stringify(this.state.profile, null, 2)}\n\n[PROMPT]\n${rawInput}`;
        }
    },

    render() {
        const list = document.getElementById('gaps-list');
        if (list) {
            list.innerHTML = '';
            this.state.profile.missed_points.forEach((gap, i) => {
                const li = document.createElement('li');
                li.className = 'tag-interactive animate-in';
                li.innerHTML = `${gap} <span class="remove" data-index="${i}">×</span>`;
                list.appendChild(li);
            });
            list.querySelectorAll('.remove').forEach(btn => {
                btn.onclick = (e) => this.deleteTag(e.target.dataset.index);
            });
        }

        const chain = document.getElementById('live-chain');
        if (chain) {
            chain.innerHTML = this.state.history.length > 0 ? '' : '<p class="dim">No active pulse detected...</p>';
            this.state.history.forEach(step => {
                const stepDiv = document.createElement('div');
                stepDiv.className = 'chain-step glass animate-in';
                stepDiv.style.padding = '15px';
                stepDiv.style.marginBottom = '10px';
                stepDiv.innerHTML = `<strong>${step.title}</strong><br><small>${step.desc}</small>`;
                chain.appendChild(stepDiv);
            });
        }

        const modeEl = document.getElementById('active-mode');
        if (modeEl) modeEl.innerText = this.state.mode.toUpperCase();
        this.updatePreview(document.getElementById('preview-test-input')?.value || "");
    },

    deleteTag(index) {
        this.state.profile.missed_points.splice(index, 1);
        this.sendToExtension({ type: "SAVE_PROFILE", profile: this.state.profile });
    }
};

document.addEventListener('DOMContentLoaded', () => CloudHub.init());

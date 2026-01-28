/**
 * LearnThinkingChain - Cognitive Engine v3.0
 * This version treats the Dashboard as a full-featured App.
 */

const AppStore = {
    state: {
        active: false,
        mode: 'novice',
        profile: { missed_points: [], thinking_styles: [], trial_error_history: [] },
        lastThinkingSteps: [],
        previewInput: "在此处测试您的提问...",
        wrappedPreview: ""
    },

    async init() {
        console.log("[LTC] Hub App Initializing...");
        await this.loadFromStorage();
        this.setupListeners();
        this.renderAll();
    },

    async loadFromStorage() {
        const data = await chrome.storage.local.get(['ltc_active', 'ltc_mode', 'ltc_profile', 'ltc_last_thinking_steps']);
        this.state.active = data.ltc_active || false;
        this.state.mode = data.ltc_mode || 'novice';
        if (data.ltc_profile) this.state.profile = data.ltc_profile;
        if (data.ltc_last_thinking_steps) this.state.lastThinkingSteps = data.ltc_last_thinking_steps;
        this.updatePreview();
    },

    setupListeners() {
        // Listen for external updates (from Gemini page)
        chrome.storage.onChanged.addListener(() => this.loadFromStorage().then(() => this.renderAll()));

        // Global Reset
        document.getElementById('reset-profile')?.addEventListener('click', () => {
            if (confirm("清空认知记忆？")) {
                this.state.profile = { missed_points: [], thinking_styles: [], trial_error_history: [] };
                this.saveProfile();
            }
        });

        // Interactive Preview
        const previewInput = document.getElementById('preview-test-input');
        previewInput?.addEventListener('input', (e) => {
            this.state.previewInput = e.target.value;
            this.updatePreview();
            this.renderPreview();
        });

        // Tag adding
        document.getElementById('add-gap-btn')?.addEventListener('click', () => {
            const input = document.getElementById('new-gap-input');
            const val = input.value.trim();
            if (val) {
                this.state.profile.missed_points.push(val);
                input.value = '';
                this.saveProfile();
            }
        });
    },

    updatePreview() {
        const MODES = {
            novice: { identity: "Peer Learner", protocol: "1. Novice Gaze\n2. Noise\n3. Trial & Error\n4. Meta-Shift" },
            socratic: { identity: "Socratic Mentor", protocol: "1. No solutions\n2. Counter-questions\n3. Scaffolding" },
            first_principles: { identity: "Analyst", protocol: "1. Atomize\n2. Rebuild\n3. Fundamental Truths" },
            analogy: { identity: "Analogy Master", protocol: "1. Daily Life Map\n2. Bridging\n3. Transfer" }
        };
        const mode = MODES[this.state.mode] || MODES.novice;
        const profileStr = JSON.stringify(this.state.profile, null, 2);

        this.state.wrappedPreview = `[IDENTITY: ${mode.identity}]
${mode.protocol}

[USER PROFILE]
${profileStr}

[CORE CHALLENGE]
${this.state.previewInput}`;
    },

    saveProfile() {
        chrome.storage.local.set({ 'ltc_profile': this.state.profile }, () => {
            this.renderAll();
        });
    },

    renderAll() {
        this.renderStatus();
        this.renderMemory();
        this.renderPreview();
        this.renderChain();
    },

    renderStatus() {
        const modeEl = document.getElementById('active-mode');
        if (modeEl) modeEl.innerText = this.state.mode.toUpperCase() + " 引擎就绪";

        const banner = document.getElementById('mode-banner-text');
        if (banner) banner.innerText = `当前协议：${this.state.mode}`;
    },

    renderMemory() {
        const list = document.getElementById('gaps-list');
        if (!list) return;
        list.innerHTML = '';
        this.state.profile.missed_points.forEach((gap, i) => {
            const tag = document.createElement('li');
            tag.className = 'tag-interactive';
            tag.innerHTML = `${gap} <span class="remove-tag" data-index="${i}">×</span>`;
            list.appendChild(tag);
        });

        // Add delete listeners
        list.querySelectorAll('.remove-tag').forEach(btn => {
            btn.onclick = (e) => {
                const idx = e.target.dataset.index;
                this.state.profile.missed_points.splice(idx, 1);
                this.saveProfile();
            };
        });
    },

    renderPreview() {
        const box = document.getElementById('current-protocol-code');
        if (box) box.innerText = this.state.wrappedPreview;
    },

    renderChain() {
        const container = document.getElementById('live-chain');
        if (!container) return;
        container.innerHTML = '';
        const steps = this.state.lastThinkingSteps.length > 0 ? this.state.lastThinkingSteps : [
            { title: "系统空闲", desc: "等待 Gemini 指令交互..." }
        ];

        steps.forEach((step, i) => {
            const div = document.createElement('div');
            div.className = 'chain-step-v3 animate-in';
            div.innerHTML = `
                <div class="step-num">${i + 1}</div>
                <div class="step-data">
                    <h5>${step.title}</h5>
                    <p>${step.desc}</p>
                </div>
            `;
            container.appendChild(div);
        });
    }
};

AppStore.init();

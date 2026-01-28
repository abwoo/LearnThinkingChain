/**
 * LearnThinkingChain - Cognitive Hub v4 (Web App Core)
 * Handles SPA Routing, State Management, and Cross-Sync
 */

const CloudHub = {
    state: {
        currentView: 'control',
        active: false,
        mode: 'novice',
        profile: { missed_points: [], thinking_styles: [] },
        history: []
    },

    async init() {
        console.log("[LTC Hub] Initializing...");
        await this.syncWithExtension();
        this.bindEvents();
        this.render();
    },

    async syncWithExtension() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            const data = await chrome.storage.local.get(['ltc_active', 'ltc_mode', 'ltc_profile', 'ltc_last_thinking_steps']);
            this.state.active = data.ltc_active || false;
            this.state.mode = data.ltc_mode || 'novice';
            this.state.profile = data.ltc_profile || { missed_points: [], thinking_styles: [] };
            this.state.history = data.ltc_last_thinking_steps || [];
        }
    },

    bindEvents() {
        // SPA Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.view;
                this.switchView(target);
            });
        });

        // Memory Interaction
        document.getElementById('add-gap-btn')?.addEventListener('click', () => {
            const input = document.getElementById('new-gap-input');
            const val = input.value.trim();
            if (val) {
                this.state.profile.missed_points.push(val);
                input.value = '';
                this.saveState();
            }
        });

        // Preview Interaction
        document.getElementById('preview-test-input')?.addEventListener('input', (e) => {
            this.updatePreview(e.target.value);
        });

        // Profile Wipe
        document.getElementById('reset-profile')?.addEventListener('click', () => {
            if (confirm("WARNING: Wipe all cognitive memory?")) {
                this.state.profile = { missed_points: [], thinking_styles: [] };
                this.saveState();
            }
        });

        // Listen for storage changes
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.onChanged.addListener(() => {
                this.syncWithExtension().then(() => this.render());
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
            'novice': '[IDENTITY: Peer Learner]\n- Simulate ignorance\n- Try/Fail loop\n- Explain meta-shift',
            'socratic': '[IDENTITY: Socratic Mentor]\n- No direct answers\n- Counter-questioning',
            'first_principles': '[IDENTITY: First-Principles Analyst]\n- Atomize facts\n- Rebuild deduction',
            'analogy': '[IDENTITY: Analogy Artist]\n- Map to daily vida\n- Bridge metaphor'
        };
        const template = protocols[this.state.mode] || protocols.novice;
        const codeBox = document.getElementById('current-protocol-code');
        if (codeBox) {
            codeBox.innerText = `${template}\n\n[USER MEMORY]\n${JSON.stringify(this.state.profile, null, 2)}\n\n[PROMPT]\n${rawInput}`;
        }
    },

    async saveState() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.set({ 'ltc_profile': this.state.profile });
            this.render();
        }
    },

    render() {
        // Render Memory Tags
        const list = document.getElementById('gaps-list');
        if (list) {
            list.innerHTML = '';
            this.state.profile.missed_points.forEach((gap, i) => {
                const li = document.createElement('li');
                li.className = 'tag-interactive';
                li.innerHTML = `${gap} <span class="remove" onClick="window.CloudHub.deleteTag(${i})">×</span>`;
                list.appendChild(li);
            });
        }

        // Render Live Chain
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

        // Pulse Status
        document.getElementById('active-mode').innerText = this.state.mode.toUpperCase();
    },

    deleteTag(index) {
        this.state.profile.missed_points.splice(index, 1);
        this.saveState();
    }
};

window.CloudHub = CloudHub;
CloudHub.init();

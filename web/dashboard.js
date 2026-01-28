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
        profile: {
            missed_points: [],
            thinking_styles: [],
            trial_error_history: [],
            knowledge_gaps: [],
            thinking_trend: "",
            meta_cognitive_level: 1,
            hidden_constraint_failures: 0,
            learning_debt: { hidden_constraint: 0 }
        },
        history: [],
        theme: 'dark'
    },

    async init() {
        console.log("[LTC Hub] Initializing...");

        // Load saved extension ID from localStorage (browser-native)
        this.state.extensionId = localStorage.getItem('ltc_extension_id') || '';
        this.state.theme = localStorage.getItem('ltc_theme') || 'dark';
        this.applyTheme(this.state.theme);
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

        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            const nextTheme = this.state.theme === 'dark' ? 'light' : 'dark';
            this.applyTheme(nextTheme);
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
            'novice': {
                identity: 'Peer Learner',
                focus: 'Explain like a peer who is still learning.',
                q1: 'Simulate a beginner\'s blind spot and surface the most misleading cue.',
                q2: 'Walk the naive path and show where it breaks.',
                q3: 'Backtrack to the missing definition or constraint.',
                q4: 'Give direction, end with an open question.'
            },
            'socratic': {
                identity: 'Socratic Mentor',
                focus: 'Ask guiding questions, never hand the answer.',
                q1: 'Identify the misconception and restate it as a question.',
                q2: 'Lead down the wrong path and expose the inconsistency.',
                q3: 'Use a counter-example, return to the principle.',
                q4: 'Ask them to rebuild the argument.'
            },
            'first_principles': {
                identity: 'First Principles Analyst',
                focus: 'Reduce to axioms and rebuild the chain.',
                q1: 'Strip analogies, find hidden variables.',
                q2: 'Try a shallow solution and show why it fails.',
                q3: 'Decompose into axioms and isolate the pivot.',
                q4: 'Provide the path, stop before computation.'
            },
            'analogy': {
                identity: 'Analogical Master',
                focus: 'Use analogy to reveal structure.',
                q1: 'Describe what a novice sees without equations.',
                q2: 'Try a weak analogy and show why it breaks.',
                q3: 'Replace with an isomorphic analogy.',
                q4: 'Map back to real variables with a question.'
            }
        };
        const p = protocols[this.state.mode] || protocols.novice;
        const codeBox = document.getElementById('current-protocol-code');
        if (codeBox) {
            codeBox.innerText = `# LearnThinkingChain Preview
[Mode] ${this.state.mode.toUpperCase()}
[Identity] ${p.identity}
[Focus] ${p.focus}

Q1: ${p.q1}
Q2: ${p.q2}
Q3: ${p.q3}
Q4: ${p.q4}

[Thinking Path Map]
Start -> Wrong Turn -> Insight -> Target

[User Memory]
${JSON.stringify(this.state.profile, null, 2)}

[Prompt]
${rawInput}`;
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
    },
    applyTheme(theme) {
        this.state.theme = theme;
        localStorage.setItem('ltc_theme', theme);
        document.body.classList.toggle('theme-light', theme === 'light');
        const toggle = document.getElementById('theme-toggle');
        if (toggle) toggle.innerText = theme === 'light' ? '☀️' : '🌙';
    }
};

document.addEventListener('DOMContentLoaded', () => CloudHub.init());

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
            thinking_trend_counts: {},
            learning_debt: { hidden_constraint: 0 }
        },
        history: [],
        theme: 'dark',
        protocols: {}
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
        setInterval(() => this.syncWithExtension(), 1000);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.syncWithExtension();
        });
        window.addEventListener('focus', () => this.syncWithExtension());
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
                    this.state.profile = this.normalizeProfile(response.ltc_profile);
                    this.state.history = response.ltc_last_thinking_steps || [];
                    this.state.protocols = response.ltc_protocols || {};
                    this.refreshProtocolEditor();
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
                this.state.profile.knowledge_gaps.push(val);
                this.sendToExtension({ type: "SAVE_PROFILE", profile: this.state.profile });
                this.renderKnowledgeGaps();
                input.value = '';
            }
        });

        document.getElementById('preview-test-input')?.addEventListener('input', (e) => {
            this.updatePreview(e.target.value);
        });

        document.getElementById('protocol-json-editor')?.addEventListener('input', (e) => {
            e.target.dataset.dirty = 'true';
        });

        document.getElementById('save-protocols')?.addEventListener('click', () => {
            const editor = document.getElementById('protocol-json-editor');
            const status = document.getElementById('protocol-save-status');
            if (!editor) return;
            try {
                const parsed = JSON.parse(editor.value || '{}');
                this.sendToExtension({ type: "SAVE_PROTOCOLS", protocols: parsed });
                editor.dataset.dirty = 'false';
                if (status) status.innerText = '已同步到扩展';
            } catch (err) {
                if (status) status.innerText = 'JSON 格式错误';
            }
        });

        document.getElementById('reset-profile')?.addEventListener('click', () => {
            if (confirm("WARNING: Wipe all cognitive memory?") && this.state.extensionId) {
                this.sendToExtension({ type: "WIPE_MEMORY" });
            }
        });

        document.getElementById('inc-hidden-constraint')?.addEventListener('click', () => {
            this.state.profile.hidden_constraint_failures += 1;
            this.state.profile.learning_debt.hidden_constraint = this.state.profile.hidden_constraint_failures;
            this.sendToExtension({ type: "SAVE_PROFILE", profile: this.state.profile });
            this.renderLearningDebtDetails();
        });

        document.getElementById('reset-learning-debt')?.addEventListener('click', () => {
            this.state.profile.hidden_constraint_failures = 0;
            this.state.profile.learning_debt.hidden_constraint = 0;
            this.state.profile.learning_debt.by_topic = {};
            this.state.profile.learning_debt.sessions = [];
            this.sendToExtension({ type: "SAVE_PROFILE", profile: this.state.profile });
            this.renderLearningDebtDetails();
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
        const fallbackProtocols = this.getFallbackProtocols();
        const p = this.getProtocolForMode();
        const codeBox = document.getElementById('current-protocol-code');
        if (codeBox) {
            codeBox.innerText = `# LearnThinkingChain Preview
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
        }
    },
    getFallbackProtocols() {
        return {
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
    },
    getProtocolForMode() {
        const fallback = this.getFallbackProtocols();
        const custom = this.state.protocols || {};
        return custom[this.state.mode] || fallback[this.state.mode] || fallback.novice;
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

        document.querySelectorAll('.learning-debt-count').forEach((el) => {
            el.innerText = this.state.profile.learning_debt?.hidden_constraint || 0;
        });

        document.querySelectorAll('.hidden-constraint-count').forEach((el) => {
            el.innerText = this.state.profile.hidden_constraint_failures || 0;
        });

        const trendEl = document.getElementById('thinking-trend');
        if (trendEl) trendEl.innerText = this.state.profile.thinking_trend || '—';

        const statusEl = document.getElementById('active-status');
        if (statusEl) {
            statusEl.innerText = this.state.active ? 'ON' : 'OFF';
            statusEl.classList.toggle('status-on', this.state.active);
            statusEl.classList.toggle('status-off', !this.state.active);
        }

        const stylesEl = document.getElementById('thinking-styles');
        if (stylesEl) {
            stylesEl.innerHTML = '';
            const styles = this.state.profile.thinking_styles || [];
            styles.forEach(style => {
                const tag = document.createElement('span');
                tag.className = 'tag-chip';
                tag.innerText = style;
                stylesEl.appendChild(tag);
            });
            if (styles.length === 0) {
                stylesEl.innerHTML = '<span class="dim">尚无记录</span>';
            }
        }

        const knowledgeEl = document.getElementById('knowledge-gaps');
        if (knowledgeEl) {
            knowledgeEl.innerHTML = '';
            const gaps = this.state.profile.knowledge_gaps || [];
            gaps.forEach(gap => {
                const tag = document.createElement('span');
                tag.className = 'tag-chip';
                tag.innerText = gap;
                knowledgeEl.appendChild(tag);
            });
            if (gaps.length === 0) {
                knowledgeEl.innerHTML = '<span class="dim">尚无记录</span>';
            }
        }

        this.renderKnowledgeGaps();
        this.renderLearningDebtDetails();
        this.renderFrameworkNetwork();
        const modeEl = document.getElementById('active-mode');
        if (modeEl) modeEl.innerText = this.state.mode.toUpperCase();
        this.updatePreview(document.getElementById('preview-test-input')?.value || "");
    },

    deleteTag(index) {
        this.state.profile.missed_points.splice(index, 1);
        this.state.profile.knowledge_gaps.splice(index, 1);
        this.sendToExtension({ type: "SAVE_PROFILE", profile: this.state.profile });
        this.renderKnowledgeGaps();
    },
    refreshProtocolEditor() {
        const editor = document.getElementById('protocol-json-editor');
        if (!editor) return;
        if (editor.dataset.dirty === 'true') return;
        const protocols = this.state.protocols || {};
        editor.value = JSON.stringify(protocols, null, 2);
        editor.dataset.dirty = 'false';
        const status = document.getElementById('protocol-save-status');
        if (status) status.innerText = '已同步';
    },
    renderFrameworkNetwork() {
        const container = document.getElementById('framework-network');
        if (!container) return;
        const mode = this.getProtocolForMode();
        const nodes = [
            { id: 'Q1', label: '认知盲区', desc: mode.q1_blind_spot || '识别噪声与误导线索', x: 80, y: 60 },
            { id: 'Q2', label: '试错模拟', desc: mode.q2_entropy || '沿直觉走到撞墙', x: 260, y: 40 },
            { id: 'Q3', label: '底层回溯', desc: mode.q3_backtrack || '回到基础概念', x: 260, y: 170 },
            { id: 'Q4', label: '认知交接', desc: mode.q4_handover || '开放式引导', x: 440, y: 120 }
        ];
        const svg = container;
        svg.innerHTML = '';
        const ns = 'http://www.w3.org/2000/svg';
        const linkPairs = [
            [0, 1],
            [1, 2],
            [2, 3]
        ];
        linkPairs.forEach(([a, b]) => {
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', nodes[a].x);
            line.setAttribute('y1', nodes[a].y);
            line.setAttribute('x2', nodes[b].x);
            line.setAttribute('y2', nodes[b].y);
            line.setAttribute('class', 'graph-line');
            svg.appendChild(line);
        });
        nodes.forEach((node) => {
            const group = document.createElementNS(ns, 'g');
            group.setAttribute('class', 'graph-node');
            const circle = document.createElementNS(ns, 'circle');
            circle.setAttribute('cx', node.x);
            circle.setAttribute('cy', node.y);
            circle.setAttribute('r', 28);
            circle.setAttribute('class', 'graph-node-circle');
            const title = document.createElementNS(ns, 'text');
            title.setAttribute('x', node.x);
            title.setAttribute('y', node.y + 4);
            title.setAttribute('text-anchor', 'middle');
            title.setAttribute('class', 'graph-node-text');
            title.textContent = node.id;
            group.appendChild(circle);
            group.appendChild(title);
            svg.appendChild(group);
        });

        const label = document.createElementNS(ns, 'text');
        label.setAttribute('x', 20);
        label.setAttribute('y', 240);
        label.setAttribute('class', 'graph-legend');
        label.textContent = `当前模式: ${this.state.mode.toUpperCase()}`;
        svg.appendChild(label);

        const matrix = document.getElementById('protocol-matrix');
        if (!matrix) return;
        const protocols = this.state.protocols || {};
        const keys = Object.keys(protocols);
        if (keys.length === 0) {
            matrix.innerHTML = '<div class="dim">尚未配置协议</div>';
            return;
        }
        matrix.innerHTML = keys.map((key) => {
            const p = protocols[key];
            return `
                <div class="matrix-card">
                    <div class="matrix-title">${p.name || key}</div>
                    <div class="matrix-sub">${p.identity || ''}</div>
                    <ul>
                        <li>${p.q1_blind_spot || ''}</li>
                        <li>${p.q2_entropy || ''}</li>
                        <li>${p.q3_backtrack || ''}</li>
                        <li>${p.q4_handover || ''}</li>
                    </ul>
                </div>
            `;
        }).join('');
    },
    renderKnowledgeGaps() {
        const detailed = document.getElementById('knowledge-gaps-detailed');
        if (!detailed) return;
        const gaps = this.state.profile.knowledge_gaps || [];
        if (gaps.length === 0) {
            detailed.innerHTML = '<div class="dim">暂无知识锚点</div>';
            return;
        }
        const counts = gaps.reduce((acc, gap) => {
            acc[gap] = (acc[gap] || 0) + 1;
            return acc;
        }, {});
        detailed.innerHTML = Object.keys(counts).map((gap) => {
            return `
                <div class="anchor-item">
                    <span class="anchor-name">${gap}</span>
                    <span class="anchor-count">${counts[gap]}</span>
                </div>
            `;
        }).join('');
    },
    renderLearningDebtDetails() {
        const topics = this.state.profile.learning_debt?.by_topic || {};
        const container = document.getElementById('learning-debt-topics');
        if (container) {
            const keys = Object.keys(topics);
            if (keys.length === 0) {
                container.innerHTML = '<div class="dim">暂无主题统计</div>';
            } else {
                container.innerHTML = keys.map((topic) => {
                    const item = topics[topic];
                    return `
                        <div class="debt-row">
                            <span>${topic}</span>
                            <span>${item.hidden_constraint_failures}/${item.total_prompts}</span>
                        </div>
                    `;
                }).join('');
            }
        }
        const sessionList = document.getElementById('learning-debt-sessions');
        if (sessionList) {
            const sessions = this.state.profile.learning_debt?.sessions || [];
            if (sessions.length === 0) {
                sessionList.innerHTML = '<div class="dim">暂无会话统计</div>';
            } else {
                sessionList.innerHTML = sessions.slice(0, 6).map((session) => {
                    return `
                        <div class="debt-row">
                            <span>${session.topic || 'general'}</span>
                            <span>${session.hidden_constraint_failures}/${session.total_prompts}</span>
                        </div>
                    `;
                }).join('');
            }
        }
    },
    normalizeProfile(profile) {
        const base = {
            missed_points: [],
            thinking_styles: [],
            trial_error_history: [],
            knowledge_gaps: [],
            thinking_trend: "",
            meta_cognitive_level: 1,
            hidden_constraint_failures: 0,
            thinking_trend_counts: {},
            learning_debt: { hidden_constraint: 0 }
        };
        const merged = { ...base, ...(profile || {}) };
        merged.learning_debt = { ...base.learning_debt, ...(merged.learning_debt || {}) };
        merged.thinking_trend_counts = { ...base.thinking_trend_counts, ...(merged.thinking_trend_counts || {}) };
        return merged;
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

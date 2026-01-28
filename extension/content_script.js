/**
 * LearnThinkingChain Content Script - v4.0 (Cognitive Meta-Architecture)
 */

console.log("[LTC] Content script v4.0 loaded");

let isActive = false;
let currentMode = "novice";
let userProfile = {
    missed_points: [],
    thinking_styles: [],
    trial_error_history: [],
    knowledge_gaps: [],
    thinking_trend: "",
    meta_cognitive_level: 1,
    hidden_constraint_failures: 0,
    thinking_trend_counts: {},
    learning_debt: {
        hidden_constraint: 0,
        by_topic: {},
        sessions: []
    },
    last_session_id: "",
    last_updated: Date.now()
};
let lastWrappedInput = "";
let lastWrappedAt = 0;
let sessionState = {
    id: "",
    topic: "general",
    started_at: 0,
    last_event_at: 0
};
const SESSION_GAP_MS = 30 * 60 * 1000;

// Q1-Q4 COGNITIVE FRAMEWORK DEFINITIONS
const DEFAULT_PROTOCOLS = {
    novice: {
        name: "Novice Backtracker",
        identity: "Peer Learner",
        focus: "Explain like a peer who is still learning, never like a final authority.",
        q1_blind_spot: "Simulate a beginner's perspective. Point out the most tempting surface cue and why it can mislead a novice.",
        q2_entropy: "Follow the naive intuition for 2-3 steps, then show exactly where the logic hits a wall.",
        q3_backtrack: "Backtrack to the first overlooked foundation (definition, constraint, or boundary condition).",
        q4_handover: "Offer a directional hint and ask a concrete, open-ended question that hands control back to the user."
    },
    socratic: {
        name: "Socratic Guide",
        identity: "Socratic Mentor",
        focus: "Use probing questions to help the learner discover the flaw themselves.",
        q1_blind_spot: "Identify the most likely misconception and restate it as a question.",
        q2_entropy: "Let the misconception unfold with a guided question, then surface the inconsistency.",
        q3_backtrack: "Expose the flaw with a counter-example or edge case, then return to the core principle.",
        q4_handover: "Ask for reconstruction: request the user to rebuild the argument step-by-step."
    },
    first_principles: {
        name: "First Principles",
        identity: "First Principles Analyst",
        focus: "Reduce the problem to atomic truths and rebuild the chain without shortcuts.",
        q1_blind_spot: "Strip away analogies and identify the missing constraint or hidden variable.",
        q2_entropy: "Attempt a shallow solution and show why it fails against the constraints.",
        q3_backtrack: "Decompose into axioms, definitions, and boundary conditions, then isolate the pivot.",
        q4_handover: "Provide the reconstruction path but stop before the final computation."
    },
    analogy: {
        name: "Analogy Weaver",
        identity: "Analogical Master",
        focus: "Use analogies to reveal structure, then map back to the original problem.",
        q1_blind_spot: "Ignore equations and describe the system behavior a beginner would observe.",
        q2_entropy: "Offer a weak analogy, then show why it breaks.",
        q3_backtrack: "Replace it with a stronger isomorphic analogy and clarify the mapping.",
        q4_handover: "Ask the user to map one element of the analogy back to the real variables."
    }
};
let MODES = { ...DEFAULT_PROTOCOLS };

function normalizeProfile(profile) {
    const base = {
        missed_points: [],
        thinking_styles: [],
        trial_error_history: [],
        knowledge_gaps: [],
        thinking_trend: "",
        meta_cognitive_level: 1,
        hidden_constraint_failures: 0,
        thinking_trend_counts: {},
        learning_debt: { hidden_constraint: 0, by_topic: {}, sessions: [] },
        last_session_id: "",
        last_updated: Date.now()
    };
    const merged = { ...base, ...(profile || {}) };
    merged.learning_debt = { ...base.learning_debt, ...(merged.learning_debt || {}) };
    merged.thinking_trend_counts = { ...base.thinking_trend_counts, ...(merged.thinking_trend_counts || {}) };
    return merged;
}

function normalizeSession(session) {
    const base = {
        id: "",
        topic: "general",
        started_at: 0,
        last_event_at: 0
    };
    return { ...base, ...(session || {}) };
}

function normalizeProtocols(protocols) {
    if (!protocols || typeof protocols !== 'object') return { ...DEFAULT_PROTOCOLS };
    const normalized = { ...DEFAULT_PROTOCOLS };
    Object.keys(protocols).forEach((key) => {
        const incoming = protocols[key];
        if (!incoming || typeof incoming !== 'object') return;
        normalized[key] = {
            ...DEFAULT_PROTOCOLS[key],
            ...incoming
        };
    });
    return normalized;
}

function applyProtocols(protocols) {
    MODES = normalizeProtocols(protocols);
    rebuildModeSelect();
    updateFrameworkPreview();
}

function rebuildModeSelect() {
    const select = document.getElementById('ltc-mode-select');
    if (!select) return;
    select.innerHTML = '';
    Object.keys(MODES).forEach((key) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = MODES[key].name || key;
        if (currentMode === key) option.selected = true;
        select.appendChild(option);
    });
    if (!MODES[currentMode]) {
        currentMode = Object.keys(MODES)[0] || 'novice';
        chrome.storage.local.set({ 'ltc_mode': currentMode });
        select.value = currentMode;
    }
}

// Load initial state
chrome.storage.local.get(['ltc_active', 'ltc_profile', 'ltc_mode', 'ltc_protocols', 'ltc_session'], (result) => {
    isActive = result.ltc_active || false;
    currentMode = result.ltc_mode || "novice";
    userProfile = normalizeProfile(result.ltc_profile);
    sessionState = normalizeSession(result.ltc_session);
    if (!result.ltc_protocols) {
        chrome.storage.local.set({ 'ltc_protocols': DEFAULT_PROTOCOLS });
    }
    applyProtocols(result.ltc_protocols || DEFAULT_PROTOCOLS);

    injectFloatingHub();
    console.log("[LTC] Initialized:", { isActive, currentMode });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.ltc_profile) {
        userProfile = normalizeProfile(changes.ltc_profile.newValue);
    }
    if (changes.ltc_session) {
        sessionState = normalizeSession(changes.ltc_session.newValue);
    }
    if (changes.ltc_protocols) {
        applyProtocols(changes.ltc_protocols.newValue);
    }
    if (changes.ltc_mode) {
        currentMode = changes.ltc_mode.newValue || currentMode;
        rebuildModeSelect();
        updateFrameworkPreview();
    }
});

/**
 * 1. Inject Floating Glass Hub (UI Polish: Better Headers, Clear Button)
 */
function injectFloatingHub() {
    if (document.getElementById('ltc-hub')) return;

    const hub = document.createElement('div');
    hub.id = 'ltc-hub';
    hub.className = 'ltc-floating-hub';

    let modeOptions = "";
    for (const key in MODES) {
        modeOptions += `<option value="${key}" ${currentMode === key ? 'selected' : ''}>${MODES[key].name}</option>`;
    }

    hub.innerHTML = `
        <div class="ltc-hub-header" id="ltc-header">
            <div class="ltc-brand">
                <span style="color:var(--accent-blue); font-size:14px;">⚡</span> THINKING CHAIN
            </div>
            <div class="ltc-drag-indicator"></div>
        </div>

        <div class="ltc-controls-row">
            <div class="ltc-toggle-group">
                <label class="ltc-switch">
                    <input type="checkbox" id="ltc-toggle-checkbox" ${isActive ? 'checked' : ''}>
                    <span class="ltc-slider"></span>
                </label>
                <select id="ltc-mode-select" class="ltc-mode-select" style="margin-left: 12px; flex: 1;">
                    ${modeOptions}
                </select>
            </div>
        </div>

        <button class="ltc-expand-btn" id="ltc-expand-btn">
            ▼ Open Cognitive Panel
        </button>

        <div class="ltc-info-panel" id="ltc-info-panel">
            <div class="ltc-panel-content">
                <div class="ltc-panel-row-header">
                    <div class="ltc-section-title">ACTIVE PROTOCOL (Q1-Q4)</div>
                </div>
                <div class="ltc-framework-box" id="ltc-framework-text">
                    Loading...
                </div>
                
                <div class="ltc-panel-row-header">
                    <div class="ltc-section-title">THINKING PATH MAP</div>
                </div>
                <div class="ltc-path-map" id="ltc-path-map">
                    <span>Start</span>
                    <span class="ltc-path-arrow">→</span>
                    <span>Wrong Turn</span>
                    <span class="ltc-path-arrow">→</span>
                    <span>Insight</span>
                    <span class="ltc-path-arrow">→</span>
                    <span>Target</span>
                </div>

                <div class="ltc-panel-row-header">
                    <div class="ltc-section-title">SESSION HISTORY</div>
                    <button id="ltc-clear-history" class="ltc-mini-btn" title="Clear History">🗑️</button>
                </div>
                <div class="ltc-history-list" id="ltc-history-list">
                    <!-- Items -->
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(hub);

    setupDraggable(hub, hub.querySelector('#ltc-header'));
    bindControls(hub);
    updateFrameworkPreview();
    loadHistory();
}

/**
 * 2. Event Binding
 */
function bindControls(hub) {
    // Toggle
    hub.querySelector('#ltc-toggle-checkbox').addEventListener('change', (e) => {
        isActive = e.target.checked;
        chrome.storage.local.set({ 'ltc_active': isActive });
        toggleInputGlow();
    });

    // Mode
    hub.querySelector('#ltc-mode-select').addEventListener('change', (e) => {
        currentMode = e.target.value;
        chrome.storage.local.set({ 'ltc_mode': currentMode });
        updateFrameworkPreview();
    });

    // Expand
    const expandBtn = hub.querySelector('#ltc-expand-btn');
    expandBtn.addEventListener('click', () => {
        hub.classList.toggle('expanded');
        expandBtn.innerText = hub.classList.contains('expanded')
            ? '▲ Close Panel'
            : '▼ Open Cognitive Panel';
    });

    // Clear History
    hub.querySelector('#ltc-clear-history').addEventListener('click', () => {
        if (confirm('Clear local session history?')) {
            chrome.storage.local.set({ 'ltc_prompt_history': [] });
            loadHistory();
        }
    });
}

function updateFrameworkPreview() {
    const el = document.getElementById('ltc-framework-text');
    if (el && MODES[currentMode]) {
        const m = MODES[currentMode];
        const compact = (text, max = 64) => {
            const clean = text.replace(/\s+/g, ' ').trim();
            return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
        };
        // Display the Q1-Q4 logic visually
        el.innerHTML = `
            <span style="color:#ff6b6b">Q1: ${compact(m.q1_blind_spot)}</span><br>
            <span style="color:#feca57">Q2: ${compact(m.q2_entropy)}</span><br>
            <span style="color:#48dbfb">Q3: ${compact(m.q3_backtrack)}</span><br>
            <span style="color:#1dd1a1">Q4: ${compact(m.q4_handover)}</span>
        `;
    }
}

function loadHistory() {
    chrome.storage.local.get(['ltc_prompt_history'], (result) => {
        const history = result.ltc_prompt_history || [];
        const listEl = document.getElementById('ltc-history-list');
        if (listEl) {
            listEl.innerHTML = '';
            if (history.length === 0) {
                listEl.innerHTML = '<div style="padding:10px; color:rgba(255,255,255,0.3); font-size:11px; text-align:center;">No active thoughts</div>';
                return;
            }
            history.forEach((text) => {
                const compact = text.replace(/\s+/g, ' ').trim();
                const shortText = compact.length > 42 ? `${compact.slice(0, 41)}…` : compact;
                const item = document.createElement('div');
                item.className = 'ltc-history-item';
                item.innerHTML = `<span class="ltc-history-text">${shortText}</span>`;
                item.title = compact;
                item.onclick = () => {
                    const inputArea = findInputArea();
                    if (inputArea) {
                        if (inputArea.tagName === 'TEXTAREA') inputArea.value = text;
                        else inputArea.innerText = text;
                    }
                };
                listEl.appendChild(item);
            });
        }
    });
}

function addToHistory(text) {
    if (!text) return;
    chrome.storage.local.get(['ltc_prompt_history'], (result) => {
        let history = result.ltc_prompt_history || [];
        // Unique check to avoid duplicate spam
        if (history[0] !== text) {
            history.unshift(text);
            if (history.length > 6) history = history.slice(0, 6); // Keep last 6
            chrome.storage.local.set({ 'ltc_prompt_history': history });
            loadHistory();
        }
    });
}

/**
 * 3. Draggable Logic
 */
function setupDraggable(element, handle) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = element.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        element.style.right = 'auto'; // Release right anchor
        element.style.left = initialLeft + 'px';
        element.style.top = initialTop + 'px';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        element.style.left = (initialLeft + dx) + 'px';
        element.style.top = (initialTop + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';
    });
}

/**
 * 4. Input Utilities
 */
function findInputArea() {
    const selectors = [
        'div[contenteditable="true"][data-lexical-editor="true"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]',
        '.input-area div[contenteditable="true"]',
        '#rich-text-input',
        'textarea[aria-label*="message"]',
        'textarea[aria-label*="消息"]',
        'textarea'
    ];
    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el;
    }
    return null;
}

function getInputValue(inputArea) {
    if (!inputArea) return "";
    if (inputArea.nodeName === 'TEXTAREA') return (inputArea.value || "").trim();
    return (inputArea.innerText || inputArea.textContent || "").trim();
}

function setInputValue(inputArea, value) {
    if (!inputArea) return;
    if (inputArea.nodeName === 'TEXTAREA') {
        inputArea.value = value;
    } else {
        inputArea.innerText = value;
    }
}

function toggleInputGlow() {
    const inputArea = findInputArea();
    if (inputArea) {
        inputArea.classList.toggle('ltc-thinking-active', isActive);
    }
}

// Keep trying to bind glow
setInterval(() => {
    if (isActive) toggleInputGlow();
}, 1000);

/**
 * 5. PROMPT ENGINEERING ENGINE (Q1-Q4 LOGIC)
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && isActive) {
        const inputArea = findInputArea();
        if (inputArea && (inputArea.contains(e.target) || e.target === inputArea)) {
            handleSubmission(inputArea);
        }
    }
}, true);

document.addEventListener('click', (e) => {
    if (isActive) {
        const btn = e.target.closest(
            'button[aria-label*="Send"], button[aria-label*="发送"], button[aria-label*="提交"], button.send-button, button[data-testid="send-button"], button[data-test-id="send-button"]'
        );
        if (btn) {
            const inputArea = findInputArea();
            if (inputArea) handleSubmission(inputArea);
        }
    }
}, true);

function handleSubmission(inputArea) {
    const rawInput = getInputValue(inputArea);
    if (!rawInput || rawInput.startsWith('# ENCODING INSTRUCTION')) return; // Avoid double wrap

    const now = Date.now();
    if (rawInput === lastWrappedInput && now - lastWrappedAt < 1200) return; // Prevent double wrap on click+enter

    updateLearningDebt(rawInput);
    userProfile.last_updated = Date.now();
    chrome.storage.local.set({ 'ltc_profile': userProfile, 'ltc_session': sessionState });

    addToHistory(rawInput); // Save user's original thought

    // THE CORE: COGNITIVE META-ARCHITECTURE INJECTION
    const wrappedPrompt = generateCognitivePrompt(rawInput);

    setInputValue(inputArea, wrappedPrompt);
    lastWrappedInput = rawInput;
    lastWrappedAt = now;

    inputArea.dispatchEvent(new Event('input', { bubbles: true }));
    inputArea.dispatchEvent(new Event('change', { bubbles: true }));

    // Sync state for dashboard
    const mode = MODES[currentMode];
    chrome.storage.local.set({
        'ltc_last_thinking_steps': [
            { title: "Q1: 盲区扫描", desc: `模拟 ${mode.identity} 视角过滤噪声` },
            { title: "Q2: 试错模拟", desc: "执行直觉偏差测试 (Entropy Path)" },
            { title: "Q3: 深度回溯", desc: "触发第一性原理 (First Principle) 纠偏" },
            { title: "Q4: 认知交接", desc: "生成开放式引导追问" }
        ]
    });
}

function updateLearningDebt(rawInput) {
    const now = Date.now();
    const topic = detectTopic(rawInput);
    ensureSession(topic, now);

    const hiddenConstraintSignals = [
        /隐藏条件/i,
        /约束/i,
        /边界条件/i,
        /条件不够/i,
        /为什么.*不对/i,
        /哪里错/i,
        /不成立/i,
        /矛盾/i,
        /算不出/i,
        /不收敛/i,
        /不行/i,
        /失败/i
    ];
    const hitHiddenConstraint = hiddenConstraintSignals.some((re) => re.test(rawInput));
    if (hitHiddenConstraint) {
        userProfile.hidden_constraint_failures += 1;
        userProfile.learning_debt.hidden_constraint = userProfile.hidden_constraint_failures;
        incrementTopicDebt(topic, true);
        incrementSessionDebt(true);
    } else {
        incrementTopicDebt(topic, false);
        incrementSessionDebt(false);
    }

    const trendSignals = [
        { key: 'formula_overuse', regex: /公式|代入|计算|推导|展开|求解/i, label: 'over-relying on formulas' },
        { key: 'visual_gap', regex: /图像|直观|几何|画图/i, label: 'weak visual intuition' },
        { key: 'assumption_blind', regex: /假设|边界|初始条件|约束/i, label: 'missing boundary assumptions' }
    ];
    trendSignals.forEach((signal) => {
        if (signal.regex.test(rawInput)) {
            userProfile.thinking_trend_counts[signal.key] = (userProfile.thinking_trend_counts[signal.key] || 0) + 1;
            userProfile.thinking_trend = signal.label;
        }
    });
}

function detectTopic(rawInput) {
    const topicSignals = [
        { key: 'mechanics', label: '力学', regex: /受力|力学|牛顿|摩擦|速度|加速度|动量|功|能量/i },
        { key: 'circuits', label: '电路', regex: /电路|电阻|电容|电感|电流|电压|欧姆/i },
        { key: 'math', label: '数学', regex: /函数|极限|导数|积分|矩阵|向量|概率|统计/i },
        { key: 'cs', label: '编程', regex: /算法|复杂度|递归|指针|并发|线程|数据库/i }
    ];
    const hit = topicSignals.find((signal) => signal.regex.test(rawInput));
    return hit ? hit.label : 'general';
}

function ensureSession(topic, now) {
    const isNew =
        !sessionState.id ||
        !sessionState.last_event_at ||
        (now - sessionState.last_event_at > SESSION_GAP_MS) ||
        (sessionState.topic && sessionState.topic !== topic);

    if (isNew) {
        const sessionId = `S${now.toString(36)}`;
        sessionState = {
            id: sessionId,
            topic,
            started_at: now,
            last_event_at: now
        };
        userProfile.last_session_id = sessionId;
        userProfile.learning_debt.sessions.unshift({
            id: sessionId,
            topic,
            started_at: now,
            last_event_at: now,
            total_prompts: 0,
            hidden_constraint_failures: 0
        });
        if (userProfile.learning_debt.sessions.length > 20) {
            userProfile.learning_debt.sessions = userProfile.learning_debt.sessions.slice(0, 20);
        }
    } else {
        sessionState.last_event_at = now;
    }
}

function incrementTopicDebt(topic, hitHidden) {
    if (!userProfile.learning_debt.by_topic[topic]) {
        userProfile.learning_debt.by_topic[topic] = {
            total_prompts: 0,
            hidden_constraint_failures: 0
        };
    }
    const topicStats = userProfile.learning_debt.by_topic[topic];
    topicStats.total_prompts += 1;
    if (hitHidden) topicStats.hidden_constraint_failures += 1;
}

function incrementSessionDebt(hitHidden) {
    const session = userProfile.learning_debt.sessions.find((s) => s.id === sessionState.id);
    if (!session) return;
    session.total_prompts += 1;
    session.last_event_at = sessionState.last_event_at;
    if (hitHidden) session.hidden_constraint_failures += 1;
}

function generateCognitivePrompt(rawInput) {
    const mode = MODES[currentMode];
    const profileJson = JSON.stringify(userProfile, null, 2);

    return `<<<LTC_START>>>
# ENCODING INSTRUCTION FOR "LEARNTHINKINGCHAIN"

## Part 0: Operating Mode
- **Mode Name**: ${mode.name}
- **Persona**: ${mode.identity}
- **Focus**: ${mode.focus}

## Part 1: Cognitive Meta-Architecture (Q1-Q4)
Your reasoning must follow a *backtracking loop*, never a straight line. Use the four quadrants below and never skip a quadrant.

**Q1 - 认知盲区 (Blind Spot)**
${mode.q1_blind_spot}
*Action*: Identify the most seductive noise or surface cue in the user's prompt.

**Q2 - 试错模拟 (Entropy Path)**
${mode.q2_entropy}
*Action*: Include a paragraph starting with **"我最初以为..."** and show the contradiction.

**Q3 - 底层回溯 (Deep Backtracking)**
${mode.q3_backtrack}
*Action*: Ask which first principle, definition, or boundary condition was ignored.

**Q4 - 认知交接 (Cognitive Handover)**
${mode.q4_handover}
*Action*: Provide direction, then stop and ask an open question.

## Part 2: Cognitive Scripting Rules
- **Rule A (De-Expertise)**: Strip advanced jargon in the first 2 paragraphs.
- **Rule B (Visual Anchors)**: Describe what a novice *sees* before they understand.
- **Rule C (The Pivot)**: Explicitly write: "Wait, this path (X) is leading to a contradiction because of (Y). Let's go back to the origin."

## Part 3: Memory & Pattern Engine (State Management)
You must adapt guidance based on the user's cognitive profile.
- If *hidden_constraint_failures* >= 2, **prioritize identifying hidden constraints** early in Q1.
- Track recurring knowledge gaps and highlight them when they appear again.

[Cognitive_Profile.json]
${profileJson}

## Part 4: Adversarial Validation (Anti-Lazy)
**Forbidden**:
- Direct final formulas or final numerical results.
- Words like "显然", "很容易得出", "obviously", "clearly".

**Mandatory**:
- One paragraph that starts with "我最初以为..."
- End with a *specific open-ended question* for the user to answer.

## Part 5: Thinking Path Map (UI Mirror)
Start → Wrong Turn → Insight → Target

## Part 6: User Input
[USER'S CURRENT CHALLENGE]
${rawInput}

---
*Execute the Q1-Q4 Logic Flow now.*
<<<LTC_END>>>`;
}

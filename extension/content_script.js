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
    last_updated: Date.now()
};
let lastWrappedInput = "";
let lastWrappedAt = 0;

// Q1-Q4 COGNITIVE FRAMEWORK DEFINITIONS
const MODES = {
    novice: {
        name: "Novice Backtracker",
        identity: "Peer Learner",
        q1_blind_spot: "Ignore technical jargon. Focus on intuitive confusion.",
        q2_entropy: "Make a common 'naive physics' mistake first.",
        q3_backtrack: "Realize the contradiction. Return to basic definitions.",
        q4_handover: "Ask a guiding question about the missing variable."
    },
    socratic: {
        name: "Socratic Guide",
        identity: "Socratic Mentor",
        q1_blind_spot: "Identify the user's likely misconception.",
        q2_entropy: "Ask a question that leads them down their wrong path.",
        q3_backtrack: " expose the flaw in that logic using a counter-example.",
        q4_handover: "Prompt them to reconstruct the argument."
    },
    first_principles: {
        name: "First Principles",
        identity: "First Principles Analyst",
        q1_blind_spot: "Strip away all analogies. Look at raw constraints.",
        q2_entropy: "Attempt a surface-level solution and fail.",
        q3_backtrack: "Break down to atomic truths (Physics/Logic axioms).",
        q4_handover: "Synthesize the axiomatic proof path."
    },
    analogy: {
        name: "Analogy Weaver",
        identity: "Analogical Master",
        q1_blind_spot: "Ignore the math. Look at the system behavior.",
        q2_entropy: "Proposed a weak analogy that breaks down.",
        q3_backtrack: "Find a stronger, isomorphic mechanical analogy.",
        q4_handover: "Map the analogy back to the specific problem."
    }
};

// Load initial state
chrome.storage.local.get(['ltc_active', 'ltc_profile', 'ltc_mode'], (result) => {
    isActive = result.ltc_active || false;
    currentMode = result.ltc_mode || "novice";
    if (result.ltc_profile) userProfile = result.ltc_profile;

    injectFloatingHub();
    console.log("[LTC] Initialized:", { isActive, currentMode });
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
        // Display the Q1-Q4 logic visually
        el.innerHTML = `
            <span style="color:#ff6b6b">Q1: ${m.q1_blind_spot}</span><br>
            <span style="color:#feca57">Q2: ${m.q2_entropy}</span><br>
            <span style="color:#48dbfb">Q3: ${m.q3_backtrack}</span><br>
            <span style="color:#1dd1a1">Q4: ${m.q4_handover}</span>
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
            history.forEach((text, index) => {
                const item = document.createElement('div');
                item.className = 'ltc-history-item';
                // Add a small index number
                item.innerHTML = `<span style="opacity:0.5; margin-right:8px;">${index + 1}.</span> ${text}`;
                item.title = text;
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
            if (history.length > 8) history = history.slice(0, 8); // Keep last 8
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

function generateCognitivePrompt(rawInput) {
    const mode = MODES[currentMode];
    const profileJson = JSON.stringify(userProfile, null, 2);

    return `# ENCODING INSTRUCTION FOR "LEARNTHINKINGCHAIN" [MODE: ${mode.name}]

## Part 1: Cognitive Scripting (The Q1-Q4 Framework)
You are simulating a "First-Principle Backtracking" thought process. You MUST follow this 4-Quadrant Logic:

**Q1 - Blind Spot (Simulated Ignorance)**
${mode.q1_blind_spot}
*Action*: Identifying the "noise" or "trap" in the user's question.

**Q2 - Entropy Path (The Mistake)**
${mode.q2_entropy}
*Action*: Explicitly start with: "I initially thought [wrong intuition]..." and show where it hits a wall.

**Q3 - Deep Backtracking (The Pivot)**
${mode.q3_backtrack}
*Action*: Use a transition like: "Wait, this path leads to a contradiction. Let's go back to the origin."

**Q4 - Cognitive Handover (The Guide)**
${mode.q4_handover}
*Action*: Do NOT give the answer. Ask a specific question that forces the user to see the missing link.

## Part 2: Adversarial Validation (Anti-Lazy Rules)
1. **FORBIDDEN**: Do NOT use words like "Obviously", "Clearly", "Simple". Do NOT give final formulas directly.
2. **MANDATORY**: You must output the "I initially thought..." paragraph.
3. **STYLE**: ${mode.identity} persona.

## Part 3: Memory State
[User Cognitive Profile]:
${profileJson}

## Part 4: The Input
[USER'S CURRENT CHALLENGE]:
${rawInput}

---
*Execute the Q1-Q4 Logic Flow now.*`;
}

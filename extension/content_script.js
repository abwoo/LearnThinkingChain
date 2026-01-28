/**
 * LearnThinkingChain Content Script - v3.0 (Floating Glass Hub)
 */

console.log("[LTC] Content script v3.0 loaded");

let isActive = false;
let currentMode = "novice";
let userProfile = {
    missed_points: [],
    thinking_styles: [],
    trial_error_history: [],
    last_updated: Date.now()
};

const MODES = {
    novice: {
        name: "Novice Mode",
        identity: "Peer Learner",
        protocol: "1. 描述初步的困惑。\n2. 尝试一个错误的直觉。\n3. 展示‘顿悟’时刻。\n4. 在最终答案前停下。",
        constraint: "Stop before the final result. Ask a guiding question."
    },
    socratic: {
        name: "Socratic Mode",
        identity: "Socratic Mentor",
        protocol: "1. 不要直接回答。\n2. 通过反问引导用户。\n3. 识别知识盲点。\n4. 鼓励逻辑自洽。",
        constraint: "NEVER provide the full answer. Only lead the user to find it themselves."
    },
    first_principles: {
        name: "First Principles",
        identity: "First Principles Analyst",
        protocol: "1. 拆解到物理/逻辑事实。\n2. 质疑所有常规假设。\n3. 从零重建推导。\n4. 解释基石。",
        constraint: "Provide an atomic breakdown. Stop before the synthesis of the final answer."
    },
    analogy: {
        name: "Analogy Mode",
        identity: "Analogical Master",
        protocol: "1. 找日常生活逻辑场景。\n2. 解释核心机制。\n3. 映射到当前问题。\n4. 提出迁移问题。",
        constraint: "Focus on conceptual mapping. Stop before the calculation/final result."
    }
};

// Load initial state
chrome.storage.local.get(['ltc_active', 'ltc_profile', 'ltc_mode'], (result) => {
    isActive = result.ltc_active || false;
    currentMode = result.ltc_mode || "novice";
    if (result.ltc_profile) userProfile = result.ltc_profile;

    // Inject the Floating Hub immediately
    injectFloatingHub();

    console.log("[LTC] Initialized:", { isActive, currentMode });
});

/**
 * 1. Inject Floating Glass Hub
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
                <span>⚡</span> THINKING CHAIN
            </div>
            <div class="ltc-drag-indicator"></div>
        </div>

        <div class="ltc-controls-row">
            <div class="ltc-toggle-group">
                <label class="ltc-switch">
                    <input type="checkbox" id="ltc-toggle-checkbox" ${isActive ? 'checked' : ''}>
                    <span class="ltc-slider"></span>
                </label>
                <select id="ltc-mode-select" class="ltc-mode-select" style="width: auto; flex: 1; margin-left: 10px;">
                    ${modeOptions}
                </select>
            </div>
        </div>

        <button class="ltc-expand-btn" id="ltc-expand-btn">
            ▼ History & Framework
        </button>

        <div class="ltc-info-panel" id="ltc-info-panel">
            <div class="ltc-panel-content">
                <div class="ltc-section-title">Active Framework</div>
                <div class="ltc-framework-box" id="ltc-framework-text">
                    Loading protocol...
                </div>
                
                <div class="ltc-section-title">Recent Prompts</div>
                <div class="ltc-history-list" id="ltc-history-list">
                    <!-- History items injected here -->
                    <div style="padding:10px; color:rgba(255,255,255,0.3); font-size:11px;">No recent history</div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(hub);

    // Bind Events
    setupDraggable(hub, hub.querySelector('#ltc-header'));
    bindControls(hub);
    updateFrameworkPreview();
    loadHistory();
}


/**
 * 2. Event Binding & Logic
 */
function bindControls(hub) {
    // Active Toggle
    const checkbox = hub.querySelector('#ltc-toggle-checkbox');
    checkbox.addEventListener('change', (e) => {
        isActive = e.target.checked;
        chrome.storage.local.set({ 'ltc_active': isActive });

        // Visual feedback on Gemini Input Area
        const inputArea = findInputArea();
        if (inputArea) inputArea.classList.toggle('ltc-thinking-active', isActive);
    });

    // Mode Select
    const modeSelect = hub.querySelector('#ltc-mode-select');
    modeSelect.addEventListener('change', (e) => {
        currentMode = e.target.value;
        chrome.storage.local.set({ 'ltc_mode': currentMode });
        updateFrameworkPreview();
    });

    // Expand Panel
    const expandBtn = hub.querySelector('#ltc-expand-btn');
    expandBtn.addEventListener('click', () => {
        hub.classList.toggle('expanded');
        expandBtn.innerText = hub.classList.contains('expanded')
            ? '▲ Hide Panel'
            : '▼ History & Framework';
    });
}

function updateFrameworkPreview() {
    const el = document.getElementById('ltc-framework-text');
    if (el && MODES[currentMode]) {
        el.innerText = MODES[currentMode].protocol;
    }
}

function loadHistory() {
    chrome.storage.local.get(['ltc_prompt_history'], (result) => {
        const history = result.ltc_prompt_history || [];
        const listEl = document.getElementById('ltc-history-list');
        if (listEl && history.length > 0) {
            listEl.innerHTML = '';
            history.forEach(text => {
                const item = document.createElement('div');
                item.className = 'ltc-history-item';
                item.innerText = text;
                item.title = text; // Tooltip full text
                item.onclick = () => {
                    // Click to copy back to input?
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
        // Add new to top, keep max 5
        history.unshift(text);
        if (history.length > 5) history = history.slice(0, 5);

        chrome.storage.local.set({ 'ltc_prompt_history': history });
        loadHistory(); // Refresh UI
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

        // Remove 'right' positioning if set, so we can control via 'left'
        element.style.right = 'auto';
        element.style.left = initialLeft + 'px';
        element.style.top = initialTop + 'px';

        document.body.style.userSelect = 'none'; // Prevent text selection
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
 * 4. Gemini Input Utilities (Same as before)
 */
function findInputArea() {
    const selectors = [
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]',
        '.input-area div[contenteditable="true"]',
        '#rich-text-input',
        'textarea'
    ];
    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el;
    }
    return null;
}

// Continuous check to bind glow effect if lost (e.g. page navigation)
setInterval(() => {
    const inputArea = findInputArea();
    if (inputArea && isActive && !inputArea.classList.contains('ltc-thinking-active')) {
        inputArea.classList.add('ltc-thinking-active');
    }
}, 1000);

/**
 * 5. Intercept & Wrap (Modified to save history)
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
        const sendButton = e.target.closest('button[aria-label*="Send"], button.send-button');
        if (sendButton) {
            const inputArea = findInputArea();
            if (inputArea) handleSubmission(inputArea);
        }
    }
}, true);

function handleSubmission(inputArea) {
    const rawInput = inputArea.innerText.trim() || (inputArea.value ? inputArea.value.trim() : "");
    if (!rawInput || rawInput.startsWith('[IDENTITY: COGNITIVE PROCESS EMULATOR]')) return;

    // Save to History before wrapping
    addToHistory(rawInput);

    const wrappedPrompt = wrapPrompt(rawInput);

    if (inputArea.nodeName === 'TEXTAREA') {
        inputArea.value = wrappedPrompt;
    } else {
        inputArea.innerText = wrappedPrompt;
    }

    inputArea.dispatchEvent(new Event('input', { bubbles: true }));
    inputArea.dispatchEvent(new Event('change', { bubbles: true }));

    // Store snapshots for the Dashboard Thinking Chain view
    const mode = MODES[currentMode];
    const snapshots = [
        { title: "协议初始化", desc: `激活 ${mode.name} 框架` },
        { title: "身份封包", desc: `模拟 ${mode.identity} 认知状态` },
        { title: "思维注入", desc: "正在向 Gemini 注入元认知指令..." }
    ];
    chrome.storage.local.set({ 'ltc_last_thinking_steps': snapshots });
}

function wrapPrompt(rawInput) {
    const mode = MODES[currentMode];
    const profileString = JSON.stringify(userProfile, null, 2);

    return `[IDENTITY: COGNITIVE PROCESS EMULATOR - ${mode.identity}]
You are NOT an expert AI. You are a representing the persona of a '${mode.identity}'.
Your goal is to simulate the 'First Principles' of thinking through a problem.

[EXECUTION PROTOCOL]
${mode.protocol}

[USER'S COGNITIVE PROFILE]
${profileString}

[USER'S CURRENT CHALLENGE]
${rawInput}

[CRITICAL CONSTRAINT]
${mode.constraint}`;
}

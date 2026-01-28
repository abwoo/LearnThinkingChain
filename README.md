# LearnThinkingChain

<div align="center">

![Status](https://img.shields.io/badge/Status-Internal%20Development-blue)
![Version](https://img.shields.io/badge/Version-3.0.0-green)
![License](https://img.shields.io/badge/License-ISC-lightgrey)

> **Cognitive Process Emulator for Gemini** | 认知过程模拟器

*Transform Gemini into a "Backtracking Cognitive Simulator" through Q1-Q4 Cognitive Meta-Architecture*

</div>

---

## 📑 Table of Contents

- [SECTION A: Quick Start (Direct Use)](#section-a-quick-start-direct-use)
- [SECTION B: Detailed Architecture (For Developers)](#section-b-detailed-architecture-for-developers)
- [Troubleshooting](#troubleshooting)

---

# SECTION A: Quick Start (Direct Use)

## 🚀 One-Minute Setup

### Step 1: Clone & Install

```bash
git clone https://github.com/abwoo/LearnThinkingChain.git
cd LearnThinkingChain
npm install
npm run build
npm run build:web
```

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `dist/extension` folder

### Optional: Build Dashboard

```bash
npm run build:web
```

Dashboard output will be in `dist/web`.

### Step 3: Activate in Gemini

1. Visit [Gemini](https://gemini.google.com)
2. Look for the **⚡ THINKING CHAIN** floating panel (top-right)
3. Toggle the switch to **ON**
4. Select your preferred cognitive protocol:
   - **Novice Backtracker**: Peer learning perspective
   - **Socratic Guide**: Question-based guidance
   - **First Principles**: Atomic truth reduction
   - **Analogy Weaver**: Analogical reasoning

## 🎮 Control Interface

### Floating Hub Controls

The **Thinking Chain Hub** appears as a floating panel in Gemini's interface:

- **Toggle Switch**: Activate/deactivate the cognitive framework
- **Protocol Selector**: Choose your cognitive mode
- **Status Indicator**: Shows system health and connection status

### How It Works

1. **Type your question** in Gemini's input box
2. **Press Enter** or click Send
3. The extension **intercepts** your input at the capture phase
4. Your prompt is **enhanced** with cognitive scaffolding:
   - Q1: Blind Spot identification
   - Q2: Entropy path exploration
   - Q3: Deep backtracking
   - Q4: Cognitive handover
5. Gemini receives the **enhanced prompt** and responds accordingly

### Visual Indicators

- **Blue Glow**: Extension is active and processing
- **Red Indicator**: Error detected (check console)
- **Green Status**: All systems operational

---

# SECTION B: Detailed Architecture (For Developers)

## 🏗️ Cognitive Logic Framework

### The Backtracking Thinking Rule-Set

LearnThinkingChain implements a **recursive search pattern** that transforms linear problem-solving into a **backtracking loop**:

```
User Input
  ↓
Q1: Novice Emulator (ZPD Perspective)
  ↓
Q2: Path Branching
  ├─→ Common Pitfall Path (intuitive but wrong)
  └─→ First Principles Path (correct but requires backtracking)
  ↓
Q3: Recursive Backtracking
  └─→ Identify pivot point where paths diverge
  ↓
Q4: Cognitive Handover
  └─→ Provide direction, stop before answer, ask open question
```

### First-Principles Approach

The system enforces **first-principles thinking** by:

1. **Stripping Analogies**: Remove surface-level comparisons
2. **Identifying Atomic Truths**: Break down to fundamental definitions
3. **Rebuilding Logic Chain**: Construct solution from axioms
4. **Validating Each Step**: Verify against boundary conditions

### Zone of Proximal Development (ZPD)

The system dynamically adjusts complexity based on:

- **Knowledge Debt**: High debt → Lower complexity
- **Weak Points**: Frequent failures → More scaffolding
- **Preferred Heuristics**: Visual/Analytical/Analogical → Tailored approach

## ⚙️ Rule Engine & Hooks

### Injection Rules: Capture Phase Logic

The `RequestInterceptor` hijacks React events using **capture phase interception**:

```typescript
// Event listener with capture flag (true = capture phase)
document.addEventListener('keydown', handler, true);

// Stop all subsequent handlers
event.stopImmediatePropagation();
event.stopPropagation();
event.preventDefault();

// Process through middleware
const processed = await PromptMiddleware.process(input);

// Re-dispatch event with processed value
element.dispatchEvent(syntheticEvent);
```

**Key Selectors** (updated for latest Gemini DOM):

```typescript
inputSelectors: [
  'div[contenteditable="true"][data-lexical-editor="true"]',
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"]',
  'textarea[aria-label*="message"]',
  'textarea[aria-label*="消息"]'
]

submitSelectors: [
  'button[aria-label*="Send"]',
  'button[aria-label*="发送"]',
  'button[data-testid="send-button"]'
]
```

### Cognitive Memory: UserCognitiveProfile Schema

```typescript
interface UserCognitiveProfile {
  // Weak Points: Topic → Failure Frequency
  weakPoints: Map<string, number>;
  
  // Preferred Learning Style
  preferredHeuristics: 'visual' | 'analytical' | 'analogical';
  
  // Session History
  sessionLogs: Array<{
    timestamp: number;
    logicBridgeUsed: string;
    promptText: string;
    responseLength: number;
    skillsDetected: string[];
  }>;
  
  // Knowledge Debt: Concept → Debt Score
  knowledgeDebt: Map<string, number>;
  
  // Metadata
  lastUpdated: number;
  totalSessions: number;
  averageResponseTime: number;
}
```

**Storage Location**: `chrome.storage.local['ltc_cognitive_profile']`

### Customization: System Prompt Template

The system prompt template can be customized for different learning subjects:

#### For Mathematics

```typescript
const mathTemplate = {
  q1_blind_spot: "Identify the most tempting formula or shortcut",
  q2_entropy: "Follow the intuitive calculation, show where it breaks",
  q3_backtrack: "Return to fundamental definitions (e.g., limit, derivative)",
  q4_handover: "Ask: 'What happens if we change this variable?'"
};
```

#### For Programming

```typescript
const codeTemplate = {
  q1_blind_spot: "Identify the surface-level syntax that misleads",
  q2_entropy: "Write the naive solution, show the edge case failure",
  q3_backtrack: "Return to data structures and algorithm fundamentals",
  q4_handover: "Ask: 'How would you optimize this for scale?'"
};
```

#### For Philosophy

```typescript
const philosophyTemplate = {
  q1_blind_spot: "Identify the common-sense assumption",
  q2_entropy: "Follow the intuitive argument, reveal the logical gap",
  q3_backtrack: "Return to first principles (definitions, axioms)",
  q4_handover: "Ask: 'What would a counter-argument look like?'"
};
```

**Modification Location**: `src/content/main.ts` → `getDefaultProtocols()`

## 🔌 Advanced API Interoperability

### Internal Messaging System

The extension uses a **multi-layer messaging architecture**:

#### Content Script ↔ Background Script

```typescript
// Content Script → Background
chrome.runtime.sendMessage({
  type: 'STATE_UPDATE',
  payload: { isActive: true, mode: 'novice' }
});

// Background → Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROFILE_UPDATE') {
    updateProfile(message.payload);
  }
});
```

#### Background Script ↔ Dashboard

```typescript
// Background → Dashboard (via chrome.runtime.sendMessage)
chrome.runtime.sendMessage({
  type: 'STATE_PUSH',
  payload: {
    active: true,
    mode: 'novice',
    latestResponse: { ... }
  }
});

// Dashboard listens via chrome.runtime.onMessage
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STATE_PUSH') {
    updateDashboard(message.payload);
  }
});
```

#### Storage Events (Cross-Component Sync)

```typescript
// Any component can listen to storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes.ltc_active) {
    // React to active state change
  }
  if (changes.ltc_profile) {
    // React to profile update
  }
});
```

### Component Communication Flow

```
User Action (Gemini Page)
  ↓
Content Script (RequestInterceptor)
  ↓
PromptMiddleware (Core Engine)
  ↓
CognitiveBridge (Knowledge Analysis)
  ↓
CognitiveProfileService (Storage)
  ↓
Background Script (State Sync)
  ↓
Dashboard (Real-time Display)
```

## 🐛 Troubleshooting

### Decision Tree for Common Issues

#### Issue: Extension Not Intercepting Input

```
1. Check if extension is active
   ├─→ Toggle switch ON? → Yes → Continue
   └─→ No → Turn ON and retry

2. Check DOM selectors
   ├─→ Open DevTools → Console
   ├─→ Run: document.querySelector('div[contenteditable="true"]')
   └─→ If null → Gemini updated DOM structure
       └─→ Update selectors in src/content/main.ts

3. Check for errors
   ├─→ Open DevTools → Console
   ├─→ Look for "RequestInterceptor" errors
   └─→ Check chrome://extensions/ → Errors section

4. Verify event interception
   ├─→ Add breakpoint in RequestInterceptor.onKeydownCapture
   └─→ Press Enter → Should hit breakpoint
```

#### Issue: State Synchronization Problems

```
1. Check storage quota
   ├─→ chrome.storage.local.getBytesInUse(null, console.log)
   └─→ If > 90% → Clear old logs/errors

2. Verify storage listeners
   ├─→ Check chrome.storage.onChanged listeners are registered
   └─→ Test: chrome.storage.local.set({ ltc_active: true })

3. Check message channels
   ├─→ Verify chrome.runtime.sendMessage is working
   └─→ Check background script is running (chrome://extensions/)
```

#### Issue: Shadow DOM UI Not Displaying

```
1. Check ShadowHost mounting
   ├─→ Verify shadowHost.mount() was called
   └─→ Check console for "ShadowHost: Mounted successfully"

2. Check CSS isolation
   ├─→ Inspect shadow root in DevTools
   ├─→ Verify styles are injected
   └─→ Check for host CSS interference

3. Check z-index conflicts
   ├─→ Verify shadow host z-index: 999999
   └─→ Check Gemini's UI z-index values
```

#### Issue: Cognitive Profile Not Updating

```
1. Check CognitiveFeedbackLoop
   ├─→ Verify response DOM is being analyzed
   └─→ Check console for "CognitiveFeedbackLoop: Analysis complete"

2. Check storage permissions
   ├─→ Verify "storage" permission in manifest.json
   └─→ Check chrome.storage.local.set() is not throwing errors

3. Check profile service
   ├─→ Verify CognitiveProfileService.save() is called
   └─→ Check chrome.storage.local.get('ltc_cognitive_profile')
```

### Error Codes Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `DOM_SELECTION_FAILED` | Input element not found | Update selectors or wait for page load |
| `STORAGE_QUOTA_EXCEEDED` | Storage limit reached | Clear old data via GlobalErrorHandler |
| `CIRCUIT_BREAKER_OPEN` | Too many failures | Check console for root cause, wait 30s |
| `SHADOW_DOM_MOUNT_FAILED` | Shadow root creation failed | Check DOM readiness, verify permissions |

### Debug Commands

```javascript
// In Chrome DevTools Console (on Gemini page)

// Check extension state
chrome.storage.local.get(['ltc_active', 'ltc_mode'], console.log);

// View cognitive profile
chrome.storage.local.get('ltc_cognitive_profile', console.log);

// View recent errors
chrome.storage.local.get('ltc_global_errors', console.log);

// View logs
chrome.storage.local.get('ltc_logs', console.log);

// Clear all data (reset)
chrome.storage.local.clear();

// Check input element
document.querySelector('div[contenteditable="true"]');

// Check if interceptor is active
// (Add breakpoint in RequestInterceptor.start())
```

## 📚 Additional Resources

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture documentation
- [PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md) - Production deployment guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) - Implementation status

## 🔗 Links

- **GitHub Repository**: [https://github.com/abwoo/LearnThinkingChain](https://github.com/abwoo/LearnThinkingChain)
- **Cloud Dashboard**: [https://abwoo.github.io/LearnThinkingChain/](https://abwoo.github.io/LearnThinkingChain/)
- **Issues**: [https://github.com/abwoo/LearnThinkingChain/issues](https://github.com/abwoo/LearnThinkingChain/issues)

## 📄 License

ISC License - See [LICENSE](./LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for Cognitive Enhancement**

*Last Updated: 2026-01-28*

</div>

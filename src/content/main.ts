/**
 * Main Content Script - 主内容脚本
 * 
 * Orchestrates all components: RequestInterceptor, PromptMiddleware, Shadow DOM UI
 */

import { RequestInterceptor } from '@infra/dom/RequestInterceptor';
import { CircuitBreaker } from '@infra/dom/CircuitBreaker';
import { ShadowHost } from '@ui/shadow/ShadowHost';
import { FloatingHub } from '@ui/shadow/FloatingHub';
import { PromptMiddleware } from '@core/engine/PromptMiddleware';
import { CognitiveProfileService, UserCognitiveProfile } from '@core/engine/CognitiveProfile';
import { ErrorBoundary } from '../utils/ErrorBoundary';
import { defaultLogger } from '../utils/logger';
import type { ProtocolMap } from '../types/Protocols';

// State
let isActive = false;
let currentMode = 'novice';
let profile: UserCognitiveProfile | null = null;
let protocols: ProtocolMap = getDefaultProtocols();
let sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Components
let interceptor: RequestInterceptor | null = null;
let circuitBreaker: CircuitBreaker | null = null;
let shadowHost: ShadowHost | null = null;
let floatingHub: FloatingHub | null = null;
let errorBoundary: ErrorBoundary | null = null;

// Initialize
async function initialize() {
  errorBoundary = new ErrorBoundary(defaultLogger);

  await errorBoundary.wrap(async () => {
    // Load profile
    profile = await CognitiveProfileService.load();
    defaultLogger.info('Cognitive profile loaded', { totalSessions: profile.totalSessions });

    // Load protocols
    const protocolsData = await chrome.storage.local.get('ltc_protocols');
    protocols = (protocolsData.ltc_protocols as ProtocolMap) || getDefaultProtocols();

    // Load active state
    const state = await chrome.storage.local.get(['ltc_active', 'ltc_mode']);
    isActive = Boolean(state.ltc_active);
    currentMode = typeof state.ltc_mode === 'string' ? state.ltc_mode : 'novice';

    // Initialize circuit breaker
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 30000
    });

    // Initialize shadow host
    shadowHost = new ShadowHost({ id: 'ltc-shadow-host' });
    const shadowRoot = shadowHost.mount();

    // Initialize floating hub
    floatingHub = new FloatingHub(shadowRoot);
    updateFloatingHub();

    // Initialize request interceptor
    interceptor = new RequestInterceptor({
      inputSelectors: [
        'div[contenteditable="true"][data-lexical-editor="true"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]',
        '.input-area div[contenteditable="true"]',
        '#rich-text-input',
        'textarea[aria-label*="message"]',
        'textarea[aria-label*="消息"]',
        'textarea'
      ],
      submitSelectors: [
        'button[aria-label*="Send"]',
        'button[aria-label*="发送"]',
        'button[aria-label*="提交"]',
        'button[data-testid="send-button"]',
        'button[data-test-id="send-button"]'
      ],
      onIntercept: async (value, element) => {
        return await handleInterception(value, element);
      },
      logger: defaultLogger
    });

    if (isActive) {
      interceptor.start();
    }

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;

      if (changes.ltc_active) {
        isActive = Boolean(changes.ltc_active.newValue);
        if (isActive) {
          interceptor?.start();
        } else {
          interceptor?.stop();
        }
        updateFloatingHub();
      }

      if (changes.ltc_mode) {
        currentMode = typeof changes.ltc_mode.newValue === 'string' ? changes.ltc_mode.newValue : 'novice';
        updateFloatingHub();
      }
    });

    defaultLogger.info('Content script initialized');
  });
}

// Handle interception
async function handleInterception(
  value: string,
  element: HTMLElement
): Promise<string | null> {
  if (!isActive || !profile) {
    return null; // Allow original
  }

  return await errorBoundary!.wrap(async () => {
    const protocol = protocols[currentMode];
    if (!protocol) {
      defaultLogger.warn('Protocol not found', { mode: currentMode });
      return null;
    }

    // Process through middleware
    const processed = await circuitBreaker!.execute(
      async () => {
        return await PromptMiddleware.process({
          originalInput: value,
          protocol,
          profile: profile!,
          sessionId
        });
      },
      () => {
        // Fallback: return null to allow original
        defaultLogger.warn('Circuit breaker fallback: allowing original input');
        return null;
      }
    );

    if (!processed) {
      return null;
    }

    // Update profile with session log
    await CognitiveProfileService.addSessionLog(profile!, {
      logicBridgeUsed: processed.logicBridges?.join(', ') ?? '',
      promptText: value,
      responseLength: 0,
      skillsDetected: []
    });

    await CognitiveProfileService.save(profile!);

    return processed.wrappedPrompt;
  }) ?? null;
}

// Update floating hub UI
function updateFloatingHub() {
  if (!floatingHub || !shadowHost) return;

  const modes = Object.entries(protocols).map(([id, p]) => ({
    id,
    name: p.name
  }));

  floatingHub.render({
    isActive,
    currentMode,
    modes,
    onToggleActive: async (active) => {
      isActive = active;
      await chrome.storage.local.set({ ltc_active: active });
      if (active) {
        interceptor?.start();
      } else {
        interceptor?.stop();
      }
    },
    onModeChange: async (modeId) => {
      currentMode = modeId;
      await chrome.storage.local.set({ ltc_mode: modeId });
    },
    status: circuitBreaker?.isHealthy()
      ? undefined
      : {
          type: 'error',
          message: 'Circuit breaker open'
        }
  });
}

// Default protocols
function getDefaultProtocols(): ProtocolMap {
  return {
    novice: {
      name: 'Novice Backtracker',
      identity: 'Peer Learner',
      focus: 'Explain like a peer who is still learning',
      q1_blind_spot: "Simulate a beginner's perspective",
      q2_entropy: 'Follow naive intuition, then show contradiction',
      q3_backtrack: 'Backtrack to first overlooked foundation',
      q4_handover: 'Offer direction and ask open question'
    },
    socratic: {
      name: 'Socratic Guide',
      identity: 'Socratic Mentor',
      focus: 'Use probing questions',
      q1_blind_spot: 'Identify misconception as question',
      q2_entropy: 'Let misconception unfold, surface inconsistency',
      q3_backtrack: 'Expose flaw with counter-example',
      q4_handover: 'Ask for reconstruction'
    },
    first_principles: {
      name: 'First Principles',
      identity: 'First Principles Analyst',
      focus: 'Reduce to atomic truths',
      q1_blind_spot: 'Strip away analogies, identify missing constraint',
      q2_entropy: 'Attempt shallow solution, show failure',
      q3_backtrack: 'Decompose into axioms and definitions',
      q4_handover: 'Provide reconstruction path, stop before computation'
    },
    analogy: {
      name: 'Analogy Weaver',
      identity: 'Analogical Master',
      focus: 'Use analogies to reveal structure',
      q1_blind_spot: 'Describe system behavior beginner would observe',
      q2_entropy: 'Offer weak analogy, show why it breaks',
      q3_backtrack: 'Replace with stronger isomorphic analogy',
      q4_handover: 'Ask user to map analogy back to variables'
    }
  };
}

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

/**
 * Prompt Middleware - 提示词中间件
 * 
 * Implements recursive search pattern and path branching logic
 */

import { CognitiveBridge, BridgeContext, BridgeResult } from './CognitiveBridge';
import { CognitiveProfileService, UserCognitiveProfile } from './CognitiveProfile';
import type { CognitiveProtocol } from '../../types/Protocols';

export interface PromptContext {
  originalInput: string;
  protocol: CognitiveProtocol;
  profile: UserCognitiveProfile;
  sessionId: string;
}

export interface ProcessedPrompt {
  wrappedPrompt: string;
  pathBranching: {
    pitfallPath: string;
    firstPrinciplesPath: string;
  };
  zpdContext: BridgeResult['zpdAdjustments'];
}

export class PromptMiddleware {
  /**
   * Process prompt through recursive search pattern
   */
  static async process(context: PromptContext): Promise<ProcessedPrompt> {
    const { originalInput, protocol, profile, sessionId } = context;

    // Detect topics
    const detectedTopics = CognitiveBridge.detectTopics(originalInput);

    // Build cognitive bridge
    const bridgeResult = await CognitiveBridge.bridge({
      profile,
      currentPrompt: originalInput,
      detectedTopics,
      sessionId
    });

    // Generate path branching
    const pathBranching = this.generatePathBranching(
      originalInput,
      protocol,
      bridgeResult
    );

    // Build recursive search prompt
    const wrappedPrompt = this.buildRecursiveSearchPrompt(
      originalInput,
      protocol,
      profile,
      bridgeResult,
      pathBranching
    );

    return {
      wrappedPrompt,
      pathBranching,
      zpdContext: bridgeResult.zpdAdjustments
    };
  }

  /**
   * Generate two paths: Common Pitfall and First Principles
   */
  private static generatePathBranching(
    input: string,
    protocol: CognitiveProtocol,
    bridgeResult: BridgeResult
  ): ProcessedPrompt['pathBranching'] {
    return {
      pitfallPath: `[COMMON PITFALL PATH]
Most users would initially approach this by: [identify the intuitive but incorrect approach]
This path leads to: [describe the logical contradiction or error]
Why it fails: [explain the hidden constraint or assumption that breaks]

${input}`,

      firstPrinciplesPath: `[FIRST PRINCIPLES PATH]
Let's start from the fundamental definitions:
1. What are the atomic truths we know?
2. What are the boundary conditions?
3. What constraints must be satisfied?

${bridgeResult.logicBridges.map(bridge => `- ${bridge}`).join('\n')}

${input}`
    };
  }

  /**
   * Build recursive search prompt with backtracking framework
   */
  private static buildRecursiveSearchPrompt(
    input: string,
    protocol: CognitiveProtocol,
    profile: UserCognitiveProfile,
    bridgeResult: BridgeResult,
    pathBranching: ProcessedPrompt['pathBranching']
  ): string {
    const profileJson = JSON.stringify({
      weakPoints: Array.from(profile.weakPoints.entries()),
      knowledgeDebt: Array.from(profile.knowledgeDebt.entries()),
      preferredHeuristics: profile.preferredHeuristics,
      totalSessions: profile.totalSessions
    }, null, 2);

    return `<<<LTC_START>>>
# COGNITIVE SANDBOX MODE: RECURSIVE SEARCH

## Operating Context
- **Protocol**: ${protocol.name} (${protocol.identity})
- **ZPD Complexity**: ${bridgeResult.zpdAdjustments.complexity.toUpperCase()}
- **Scaffolding**: ${bridgeResult.zpdAdjustments.scaffolding.join(', ')}
- **Knowledge Debt Addressed**: ${bridgeResult.knowledgeDebtAddressed.join(', ') || 'None'}

## Q1: NOVICE EMULATOR (Zone of Proximal Development)
${protocol.q1_blind_spot}

**Your Task**: 
1. Adopt a "Zone of Proximal Development" perspective
2. Identify what a learner at THIS level would see/think first
3. Point out the most seductive surface cue that would mislead them

## Q2: PATH BRANCHING (Dual Exploration)

### Path A: Common Pitfall Path
${pathBranching.pitfallPath}

**Execute Path A**: Walk through the intuitive but incorrect approach. Show exactly where it breaks.

### Path B: First Principles Path  
${pathBranching.firstPrinciplesPath}

**Execute Path B**: Rebuild from atomic truths. Show the correct logical chain.

**Critical**: You MUST explore BOTH paths before converging to a solution.

## Q3: RECURSIVE BACKTRACKING
${protocol.q3_backtrack}

**Recursive Search Pattern**:
1. If Path A fails → backtrack to: "What fundamental assumption was wrong?"
2. If Path B succeeds → backtrack to: "Why did Path A fail? What did it miss?"
3. Identify the pivot point where the paths diverge

## Q4: COGNITIVE HANDOVER
${protocol.q4_handover}

**Mandatory Actions**:
1. Provide direction but STOP before the final answer
2. Ask an open-ended question that requires the user to apply what they learned
3. Reference the knowledge debt concepts: ${bridgeResult.knowledgeDebtAddressed.join(', ') || 'None'}

## Cognitive Profile Context
[Cognitive_Profile.json]
${profileJson}

## Adversarial Validation
**FORBIDDEN**:
- Direct final formulas/answers
- "Obviously", "Clearly", "很容易得出"
- Skipping the backtracking loop

**MANDATORY**:
- Paragraph starting with "我最初以为..." (I initially thought...)
- Explicit backtracking: "Wait, this path leads to contradiction because..."
- Open-ended question at the end

## User Input
[USER'S CURRENT CHALLENGE]
${input}

---
*Execute the recursive search pattern now. Explore both paths, backtrack, then handover.*
<<<LTC_END>>>`;
  }
}

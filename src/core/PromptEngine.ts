import { FrameworkStore, type ThinkingFramework } from './storage/FrameworkStore';

export class PromptEngine {
  /**
   * 将用户输入包裹为系统提示 + 用户内容
   */
  static wrapWithFramework(framework: ThinkingFramework, userInput: string): string {
    const tpl = framework.systemPrompt;
    const safeInput = userInput.trim();

    if (!tpl.includes('{{userInput}}')) {
      return `${tpl.trim()}\n\n[USER INPUT]: ${safeInput}`;
    }

    return tpl.replace(/{{userInput}}/g, safeInput);
  }

  /**
   * 获取当前激活的思维框架，如果没有则回退到默认 Novice Backtracker
   */
  static async getActiveFramework(): Promise<ThinkingFramework> {
    const frameworks = await FrameworkStore.getFrameworks();
    const active = frameworks.find((f) => f.isActive);
    return active ?? FrameworkStore.getDefaultFramework();
  }

  /**
   * 将用户输入包裹为系统提示 + 用户内容
   */
  static async wrapUserInput(userInput: string): Promise<string> {
    const framework = await PromptEngine.getActiveFramework();
    return PromptEngine.wrapWithFramework(framework, userInput);
  }
}


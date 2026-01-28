export type DomChangeHandler = () => void;

export class DomObserver {
  private observer: MutationObserver | null = null;
  private readonly handler: DomChangeHandler;

  constructor(handler: DomChangeHandler) {
    this.handler = handler;
  }

  start(): void {
    if (this.observer) return;
    this.observer = new MutationObserver(() => this.handler());
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}

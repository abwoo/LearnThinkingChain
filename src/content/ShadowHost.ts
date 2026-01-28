export class ShadowHost {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;

  mount(id: string): ShadowRoot {
    if (this.shadow) return this.shadow;
    const host = document.createElement('div');
    host.id = id;
    document.body.appendChild(host);
    this.host = host;
    this.shadow = host.attachShadow({ mode: 'open' });
    return this.shadow;
  }

  unmount(): void {
    if (this.host) {
      this.host.remove();
    }
    this.host = null;
    this.shadow = null;
  }
}

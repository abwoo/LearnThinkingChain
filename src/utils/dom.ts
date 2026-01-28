export type InputElement = HTMLTextAreaElement | HTMLInputElement | HTMLElement;

export function isContentEditable(el: Element | null): el is HTMLElement {
  return !!el && (el as HTMLElement).isContentEditable;
}

export function getInputValue(el: InputElement): string {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value.trim();
  }
  if (isContentEditable(el)) {
    return (el.innerText || el.textContent || '').trim();
  }
  return '';
}

export function setInputValue(el: InputElement, value: string): void {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const nativeSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
    if (nativeSetter) nativeSetter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  if (isContentEditable(el)) {
    el.innerText = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

export function elementIsAttached(el: Element | null): boolean {
  return !!el && el.isConnected;
}

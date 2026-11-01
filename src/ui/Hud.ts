const CAPTION_MS = 4000;

export class Hud {
  private readonly overlay: HTMLElement;
  private readonly prompt: HTMLElement;
  private readonly promptVi: HTMLElement;
  private readonly promptEn: HTMLElement;
  private readonly caption: HTMLElement;
  private captionTimer = 0;

  constructor(root: HTMLElement, overlay: HTMLElement) {
    this.overlay = overlay;

    const reticle = document.createElement('div');
    reticle.className = 'reticle';
    reticle.setAttribute('aria-hidden', 'true');
    root.append(reticle);

    this.prompt = document.createElement('div');
    this.prompt.className = 'prompt';
    this.prompt.dataset.testid = 'prompt';
    this.prompt.hidden = true;

    const key = document.createElement('span');
    key.className = 'prompt__key';
    key.textContent = 'E';

    const text = document.createElement('span');
    text.className = 'prompt__text';

    this.promptVi = document.createElement('span');
    this.promptVi.className = 'prompt__vi';
    this.promptEn = document.createElement('span');
    this.promptEn.className = 'prompt__en';

    text.append(this.promptVi, this.promptEn);
    this.prompt.append(key, text);
    root.append(this.prompt);

    this.caption = document.createElement('div');
    this.caption.className = 'caption';
    this.caption.dataset.testid = 'caption';
    this.caption.hidden = true;
    root.append(this.caption);
  }

  setPrompt(vi: string | null, en = ''): void {
    if (!vi) {
      this.prompt.hidden = true;
      return;
    }
    this.promptVi.textContent = vi;
    this.promptEn.textContent = en;
    this.promptEn.hidden = en.length === 0;
    this.prompt.hidden = false;
  }

  showCaption(text: string, ms = CAPTION_MS): void {
    this.caption.textContent = text;
    this.caption.hidden = false;
    window.clearTimeout(this.captionTimer);
    this.captionTimer = window.setTimeout(() => {
      this.caption.hidden = true;
    }, ms);
  }

  fade(to: number, ms: number): Promise<void> {
    this.overlay.style.transition = `opacity ${ms}ms ease`;
    this.overlay.style.opacity = String(to);
    this.overlay.style.pointerEvents = to > 0.9 ? 'auto' : 'none';
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  showEndCard(onRestart: () => void): void {
    this.overlay.innerHTML = '';
    this.overlay.style.opacity = '1';
    this.overlay.style.pointerEvents = 'auto';

    const card = document.createElement('div');
    card.className = 'endcard';
    card.dataset.testid = 'endcard';

    const title = document.createElement('h1');
    title.textContent = 'Hành trình hoàn tất';
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Journey complete — you boarded the train.';

    const restart = document.createElement('button');
    restart.type = 'button';
    restart.textContent = 'Đi lại — Ride again';
    restart.addEventListener('click', onRestart);

    card.append(title, subtitle, restart);
    this.overlay.append(card);
  }

  hideEndCard(): void {
    this.overlay.innerHTML = '';
    this.overlay.style.opacity = '0';
    this.overlay.style.pointerEvents = 'none';
  }
}

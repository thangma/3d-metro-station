export class Title {
  private readonly root: HTMLElement;
  private visible = true;

  constructor(container: HTMLElement, onStart: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'title-overlay';
    this.root.setAttribute('data-testid', 'title-overlay');
    this.root.innerHTML = `
      <div class="title-card">
        <h1 class="title-heading">HÀ NỘI METRO</h1>
        <p class="title-sub">Ga ngầm tuyến metro đô thị · Walkthrough</p>
        <button class="title-start-btn" data-testid="start-button">Bắt đầu / Start</button>
      </div>
    `;

    const btn = this.root.querySelector<HTMLButtonElement>('.title-start-btn');
    btn?.addEventListener('click', () => {
      this.hide();
      onStart();
    });

    container.appendChild(this.root);
  }

  show(): void {
    this.visible = true;
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.visible = false;
    this.root.style.display = 'none';
  }

  get isVisible(): boolean {
    return this.visible;
  }
}

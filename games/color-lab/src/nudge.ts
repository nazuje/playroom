/** How long the lab waits, with no tap at all, before pointing at the next step again. */
export const IDLE_MS = 8000;

/**
 * Points a child who can't read at the next thing to tap, with the sound off too.
 * The next step pulses as soon as it is named, any tap calms it, and after a quiet
 * spell it pulses again. Ends with the signal.
 */
export class Nudge {
  private targets: HTMLElement[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly signal: AbortSignal;

  constructor(signal: AbortSignal) {
    this.signal = signal;
    // Capture runs before the tapped button's own handler, so a step it names isn't calmed at once.
    document.addEventListener('pointerdown', () => this.calm(), { capture: true, signal });
    signal.addEventListener('abort', () => this.calm(), { once: true });
  }

  /** The next step pulses now and again after a quiet spell. */
  now(...targets: HTMLElement[]): void {
    this.set(targets);
    this.pulse();
  }

  /** The next step pulses only after a quiet spell, for when the child is clearly busy. */
  later(...targets: HTMLElement[]): void {
    this.set(targets);
    this.wait();
  }

  private set(targets: HTMLElement[]): void {
    this.calm();
    this.targets = targets;
  }

  private pulse(): void {
    if (this.signal.aborted) return;
    for (const target of this.targets) target.classList.add('nudge');
    this.wait();
  }

  private wait(): void {
    clearTimeout(this.timer);
    if (this.signal.aborted || this.targets.length === 0) return;
    this.timer = setTimeout(() => this.pulse(), IDLE_MS);
  }

  private calm(): void {
    clearTimeout(this.timer);
    for (const target of this.targets) target.classList.remove('nudge');
    this.wait();
  }
}

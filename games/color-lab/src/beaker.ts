import { el, prefersCalm, replayClass, wait } from './dom.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ARMS_PER_COLOR = 3;
const SPIRAL_TURN = Math.PI * 1.7;
const SPIRAL_STEPS = 28;
const BUBBLES = 8;

export const SWIRL_MS = 2600;
const STIR_MS = 900;
const EMPTY_MS = 450;

function point(radius: number, angle: number): string {
  return `${(Math.cos(angle) * radius).toFixed(1)} ${(Math.sin(angle) * radius).toFixed(1)}`;
}

/** One curved ribbon from the middle of the swirl to its edge, as SVG path data. */
function spiralArm(startAngle: number, width: number): string {
  const out: string[] = [];
  const back: string[] = [];
  for (let step = 0; step <= SPIRAL_STEPS; step++) {
    const along = step / SPIRAL_STEPS;
    const angle = startAngle + along * SPIRAL_TURN;
    out.push(point(along * 145, angle));
    back.unshift(point(along * 145, angle + width));
  }
  return `M${out.join('L')}L${back.join('L')}Z`;
}

/** A disc of curved ribbons, one color each. Spinning and blurring it looks like stirred paint. */
function swirlDisc(colors: string[]): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '-100 -100 200 200');
  svg.setAttribute('class', 'swirl');
  svg.setAttribute('aria-hidden', 'true');

  const base = document.createElementNS(SVG_NS, 'circle');
  base.setAttribute('r', '145');
  base.setAttribute('fill', colors[0] ?? '#fff');
  svg.append(base);

  const arms = Math.max(colors.length, 2) * ARMS_PER_COLOR;
  const width = (Math.PI * 2) / arms;
  for (let arm = 0; arm < arms; arm++) {
    const ribbon = document.createElementNS(SVG_NS, 'path');
    ribbon.setAttribute('d', spiralArm(arm * width, width * 1.02));
    ribbon.setAttribute('fill', colors[arm % colors.length] ?? '#fff');
    svg.append(ribbon);
  }
  return svg;
}

function waveSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 240 16');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'wave');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M0 8Q15 0 30 8T60 8T90 8T120 8T150 8T180 8T210 8T240 8V16H0Z');
  svg.append(path);
  return svg;
}

/**
 * The glass beaker, the star of the lab. Paint sits in it as separate bands until
 * it is stirred, when a spiral of the paint colors spins, blurs and melts away to
 * show the mixed color already waiting underneath.
 */
export class Beaker {
  readonly element = el('div', 'beaker');
  private readonly liquid = el('div', 'liquid');
  private readonly body = el('div', 'liquid-body');
  private readonly bands = el('div', 'bands');
  private readonly solid = el('div', 'solid');
  /** The stirred paint, kept so a later pour can sit on top of it as a band. */
  private mixedHex: string | null = null;
  /** Bumped by every pour, so a slow empty can tell it has been overtaken. */
  private pours = 0;

  constructor() {
    const glass = el('div', 'beaker-glass');
    const bubbles = el('div', 'bubbles');
    for (let i = 0; i < BUBBLES; i++) {
      const bubble = el('span', 'bubble');
      bubble.style.setProperty('--x', `${8 + ((i * 37) % 84)}%`);
      bubble.style.setProperty('--delay', `${(i * 0.23).toFixed(2)}s`);
      bubble.style.setProperty('--size', `${6 + (i % 3) * 4}px`);
      bubbles.append(bubble);
    }
    this.body.append(this.solid, this.bands, bubbles);
    this.liquid.append(waveSvg(), this.body);
    const ticks = el('div', 'ticks');
    ticks.append(el('span'), el('span'), el('span'));
    glass.append(this.liquid, ticks, el('div', 'shine'));
    this.element.append(el('div', 'beaker-rim'), glass);
    this.element.setAttribute('role', 'img');
    this.element.setAttribute('aria-label', 'A beaker');
  }

  setLabel(label: string): void {
    this.element.setAttribute('aria-label', label);
  }

  /** How full the beaker looks, from 0 to 100. */
  private setFill(percent: number): void {
    this.pours += 1;
    this.liquid.style.setProperty('--fill', String(percent));
  }

  private setSurface(hex: string): void {
    this.liquid.style.setProperty('--surface', hex);
  }

  /**
   * Paint poured in but not stirred: it sits on top as its own band. Paint that
   * was already stirred turns into one thick band underneath, partsBelow deep.
   */
  addBand(hex: string, fill: number, partsBelow = 0): void {
    if (this.mixedHex && this.bands.childElementCount === 0) {
      const base = el('div', 'band');
      base.style.background = this.mixedHex;
      base.style.flexGrow = String(partsBelow);
      this.bands.append(base);
    }
    const band = el('div', 'band');
    band.style.background = hex;
    this.bands.append(band);
    void band.offsetWidth;
    band.classList.add('band-in');
    this.setSurface(hex);
    this.setFill(fill);
  }

  /** Spins the paints together until only the result shows. */
  async swirl(colors: string[], result: string, duration = SWIRL_MS): Promise<void> {
    for (const old of this.body.querySelectorAll('.swirl')) old.remove();
    const disc = swirlDisc(colors);
    disc.style.setProperty('--swirl-ms', `${duration}ms`);
    this.solid.style.background = result;
    this.mixedHex = result;
    this.bands.replaceChildren();
    this.body.append(disc);
    this.setSurface(result);
    this.element.classList.add('stirring');

    await wait(duration);

    this.element.classList.remove('stirring');
    disc.remove();
  }

  /** A quick stir for Free Paint, where the color changes on every tap. */
  stir(colors: string[], result: string, fill: number): void {
    this.setFill(fill);
    if (prefersCalm()) {
      this.show(result, fill);
      return;
    }
    void this.swirl(colors, result, STIR_MS);
  }

  /** Mixed paint, with no animation. */
  show(hex: string, fill: number): void {
    this.solid.style.background = hex;
    this.mixedHex = hex;
    this.setSurface(hex);
    this.setFill(fill);
  }

  /** The little cheer once the result is in. */
  celebrate(): void {
    replayClass(this.element, 'pop');
    const sparks = el('div', 'sparks');
    sparks.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 6; i++) {
      const spark = el('span', 'spark', '✨');
      spark.style.setProperty('--turn', `${i * 60}deg`);
      sparks.append(spark);
    }
    this.element.append(sparks);
    void wait(1200).then(() => sparks.remove());
  }

  wiggle(): void {
    replayClass(this.element, 'wiggle');
  }

  /**
   * A miss is funny, not sad: the beaker goes cross-eyed, wobbles and burps up one
   * big bubble. No sparkle, which is only for a right answer.
   */
  oops(): void {
    replayClass(this.element, 'oops');
    for (const old of this.element.querySelectorAll('.eyes, .burp')) old.remove();
    const eyes = el('div', 'eyes');
    eyes.setAttribute('aria-hidden', 'true');
    eyes.append(el('span', 'eye eye-left'), el('span', 'eye eye-right'));
    const burp = el('div', 'burp');
    burp.setAttribute('aria-hidden', 'true');
    this.element.append(eyes, burp);
    void wait(1900).then(() => {
      eyes.remove();
      burp.remove();
    });
  }

  /** A rare treat: something pops up out of the paint, waves, and ducks back in. */
  surprise(emoji: string): void {
    for (const old of this.element.querySelectorAll('.peek')) old.remove();
    const peek = el('div', 'peek', emoji);
    peek.setAttribute('aria-hidden', 'true');
    this.element.append(peek);
    void wait(2600).then(() => peek.remove());
  }

  setBubbling(on: boolean): void {
    this.element.classList.toggle('bubbling', on);
  }

  /** Pours everything out. */
  async empty(): Promise<void> {
    this.setFill(0);
    const pour = this.pours;
    await wait(EMPTY_MS);
    if (pour !== this.pours) return;
    this.bands.replaceChildren();
    this.mixedHex = null;
    this.solid.style.background = 'transparent';
    this.setSurface('transparent');
  }
}

/** Fills evenly by parts, leaving headroom, so Free Paint can keep going past the top. */
export function fillFor(parts: number): number {
  return Math.min(88, 16 + parts * 9);
}

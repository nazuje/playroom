// The reef itself: branching coral, swaying seaweed, shells and starfish, drawn as small SVGs. They sit at the
// edges of the water and on the sand, and dress up the win cards. None of them ever catches a tap.
import { element } from '../ui.ts';

const SVG = 'http://www.w3.org/2000/svg';

/** A branching coral, in a colour. */
const coral = (color: string, tips: string): string => `
  <svg viewBox="0 0 60 80" xmlns="${SVG}" aria-hidden="true">
    <g fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M30 80 V48 M30 58 L17 42 L11 26 M17 42 L23 24 M30 52 L44 36 L41 18 M44 36 L54 25 M30 48 V26"/>
    </g>
    <g fill="${tips}">
      <circle cx="11" cy="25" r="4.5"/><circle cx="23" cy="23" r="4.5"/><circle cx="41" cy="17" r="4.5"/>
      <circle cx="54" cy="24" r="4.5"/><circle cx="30" cy="25" r="4.5"/>
    </g>
  </svg>`;

/** A round fan of brain coral, low on the sand. */
const brain = (color: string, groove: string): string => `
  <svg viewBox="0 0 70 40" xmlns="${SVG}" aria-hidden="true">
    <path d="M2 40 Q2 4 35 4 Q68 4 68 40 Z" fill="${color}"/>
    <path d="M12 38 Q14 16 35 14 Q56 16 58 38 M22 38 Q24 24 35 23 Q46 24 48 38" fill="none" stroke="${groove}" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

/** Two strands of seaweed. */
const seaweed = (): string => `
  <svg viewBox="0 0 40 110" xmlns="${SVG}" aria-hidden="true">
    <path d="M12 110 C2 88 22 74 12 54 C3 36 18 24 12 4" fill="none" stroke="#2fae6b" stroke-width="7" stroke-linecap="round"/>
    <path d="M28 110 C36 92 20 82 28 64 C35 50 24 40 30 26" fill="none" stroke="#5fd08a" stroke-width="6" stroke-linecap="round"/>
  </svg>`;

/** A scallop shell. */
export const shell = (color = '#ffd8cc'): string => `
  <svg viewBox="0 0 48 40" xmlns="${SVG}" aria-hidden="true">
    <path d="M24 38 L4 18 Q24 -6 44 18 Z" fill="${color}" stroke="#e8967f" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M24 38 L14 10 M24 38 L24 6 M24 38 L34 10" stroke="#e8967f" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;

/** A five-armed starfish. */
export const starfish = (color = '#ffa94d'): string => `
  <svg viewBox="0 0 50 50" xmlns="${SVG}" aria-hidden="true">
    <path d="M25 3 L31 18 L47 19 L34 29 L39 45 L25 36 L11 45 L16 29 L3 19 L19 18 Z" fill="${color}" stroke="#d9772a" stroke-width="2.5" stroke-linejoin="round"/>
    <g fill="#fff3d6"><circle cx="25" cy="13" r="1.6"/><circle cx="36" cy="22" r="1.6"/><circle cx="14" cy="22" r="1.6"/><circle cx="31" cy="34" r="1.6"/><circle cx="19" cy="34" r="1.6"/></g>
  </svg>`;

function piece(className: string, svg: string): HTMLElement {
  const made = element('span', className);
  made.innerHTML = svg;
  return made;
}

/** The coral and seaweed growing up from the sand at both edges of the screen. */
export function createReef(): HTMLElement {
  const reef = element('div', 'reef');
  reef.setAttribute('aria-hidden', 'true');
  reef.append(
    piece('reef-piece reef-coral reef-left', coral('#ff6f61', '#ffb3a7')),
    piece('reef-piece reef-weed reef-left-2', seaweed()),
    piece('reef-piece reef-brain reef-left-3', brain('#c39bff', '#8a5fd1')),
    piece('reef-piece reef-weed reef-right', seaweed()),
    piece('reef-piece reef-coral reef-right-2', coral('#ff9fcf', '#ffe0f0')),
    piece('reef-piece reef-brain reef-right-3', brain('#ffa04d', '#cc6a1e')),
  );
  return reef;
}

/** Coral, seaweed and a starfish around the edge of a win card. */
export function cardReef(): HTMLElement[] {
  return [
    piece('card-reef card-coral', coral('#ff6f61', '#ffb3a7')),
    piece('card-reef card-weed', seaweed()),
    piece('card-reef card-star', starfish()),
    piece('card-reef card-shell', shell()),
  ];
}

/** The golden paint for a surprise set, shared by every critter drawing on the page. */
export function goldenPaint(): SVGSVGElement {
  const defs = document.createElementNS(SVG, 'svg');
  defs.setAttribute('aria-hidden', 'true');
  defs.setAttribute('width', '0');
  defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  defs.innerHTML = `<defs><linearGradient id="spin-gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff6b0"/><stop offset="0.45" stop-color="#ffd23f"/><stop offset="1" stop-color="#e09b00"/>
  </linearGradient></defs>`;
  return defs;
}

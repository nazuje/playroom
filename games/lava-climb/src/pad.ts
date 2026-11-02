import { buttonOf, Held, type Button } from './keys.ts';
import { NO_INPUT, type Input } from './sim.ts';
import { element } from './ui.ts';

export interface Pad {
  held: Held;
  /** The buttons as they were at a moment in the last frame, read forward in time only. */
  inputAt: (time: number) => Input;
  /** Called on every fresh press, for skipping the singe and waking sound. */
  onPress: (listener: () => void) => void;
  show: () => void;
  stop: () => void;
}

interface Zone {
  element: HTMLElement;
  button: Button;
}

/**
 * Four big zones with no gaps between them, read from each finger's position rather than from what it
 * first touched. A thumb can roll from left to right without lifting, and any finger on the tower itself
 * jumps, so a second finger always works.
 */
export function createPad(root: HTMLElement, field: HTMLElement, moveBox: HTMLElement, actBox: HTMLElement, hasDash: boolean): Pad {
  const held = new Held();
  const zones: Zone[] = [];
  const zone = (box: HTMLElement, name: Button, face: string): void => {
    const made = element('div', `zone zone-${name}`);
    made.dataset.zone = name;
    made.textContent = face;
    box.append(made);
    zones.push({ element: made, button: name });
  };
  zone(moveBox, 'left', '◀');
  zone(moveBox, 'right', '▶');
  if (hasDash) zone(actBox, 'dash', '💨');
  zone(actBox, 'jump', '▲');

  // Every change is kept with the moment it happened, so a slow screen still plays each press on the
  // tick it was meant for. A slow tablet gets the same jump as a fast one, only drawn less often.
  const changes: { at: number; input: Input }[] = [];
  let current: Input = { dir: 0, jump: false, dash: false };
  const pressListeners: (() => void)[] = [];

  function show(): void {
    for (const { element: made, button: name } of zones) made.classList.toggle('on', held.has(name));
  }

  function zoneAt(x: number, y: number): Button | null {
    for (const { element: made, button: name } of zones) {
      const box = made.getBoundingClientRect();
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return name;
    }
    return null;
  }

  function note(at: number): void {
    changes.push({ at, input: { dir: held.dir, jump: held.has('jump'), dash: held.has('dash') } });
    show();
  }

  function press(source: string, name: Button | null, at: number): void {
    held.press(source, name);
    note(at);
  }

  const onDown = (event: PointerEvent): void => {
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    const name = zoneAt(event.clientX, event.clientY);
    const onField = event.target === field;
    if (name === null && !onField) return;
    event.preventDefault();
    press(`p${event.pointerId}`, name ?? 'jump', event.timeStamp);
    for (const listener of pressListeners) listener();
  };

  const onMove = (event: PointerEvent): void => {
    const source = `p${event.pointerId}`;
    if (!held.isSource(source)) return;
    const name = zoneAt(event.clientX, event.clientY);
    if (name !== null) press(source, name, event.timeStamp);
  };

  const onUp = (event: PointerEvent): void => {
    held.release(`p${event.pointerId}`);
    note(event.timeStamp);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const name = buttonOf(event.code);
    if (!name) return;
    event.preventDefault();
    if (event.repeat) return;
    press(event.code, name, event.timeStamp);
    for (const listener of pressListeners) listener();
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    held.release(event.code);
    note(event.timeStamp);
  };

  const letGo = (): void => {
    held.releaseAll();
    note(performance.now());
  };

  root.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', letGo);

  return {
    held,
    inputAt(time) {
      // A tap too quick for one tick still counts, once. Only a fresh press does: fingers lifting one
      // after the other must not read as a press of whatever was already held.
      const before = current;
      let tapped: Input = NO_INPUT;
      while (changes.length > 0 && changes[0]!.at <= time) {
        current = changes.shift()!.input;
        tapped = { dir: current.dir || tapped.dir, jump: current.jump || tapped.jump, dash: current.dash || tapped.dash };
      }
      return {
        dir: current.dir || (before.dir === 0 ? tapped.dir : 0),
        jump: current.jump || (!before.jump && tapped.jump),
        dash: current.dash || (!before.dash && tapped.dash),
      };
    },
    onPress: (listener) => pressListeners.push(listener),
    show,
    stop() {
      root.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', letGo);
    },
  };
}

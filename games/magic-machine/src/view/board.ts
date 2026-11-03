// The contraption on screen: the conveyor belt of examples on top, then one machine or two in a row, each with
// gauges for eyes, spinning gears, a chimney that puffs and a "?" plate hiding its rule. A token waits in the
// hopper on top and comes out of the chute at the bottom. Plain DOM and CSS; the play screen says what happens
// and when.
import type { Level } from '../rules/levels.ts';
import type { Rule } from '../rules/machine.ts';
import { button, calm, element } from '../ui.ts';
import { fillToken, ruleFace, token } from './tokens.ts';

export type SlotId = 'in' | 'out';
export type Tone = 'right' | 'wrong' | '';
export type Check = boolean | null;

export interface BoardView {
  show(level: Level): void;
  layout(): void;
  onPair(listener: (index: number) => void): void;
  onPlate(listener: (slot: number) => void): void;
  onSlot(listener: (slot: SlotId) => void): void;
  /** A number in the hopper or the chute, a "?" for null, or an empty spot for undefined. */
  setSlot(slot: SlotId, value: number | null | undefined, tone?: Tone): void;
  /** What a backwards guess really made, shown beside the wanted number. Null puffs out smoke: it can't. */
  showGot(value: number | null | undefined): void;
  /** The token in the hopper drops into the machine. */
  drop(): void;
  /** Shakes, whirs and puffs the machines, one after the other. Smoke instead of steam for a miss. */
  churn(ms: number, smoke: boolean): void;
  /** The tokens in the pipes between machines, with their numbers once they are no secret. Undefined hides one. */
  setMiddle(values: readonly (number | undefined)[]): void;
  /** One lamp per puzzle of the shift: lit for each one solved, blinking for the one on the machine. */
  setLamps(done: number, total: number): void;
  /** A plate shut, open on its rule, or showing a card being tried. */
  setPlate(slot: number, rule: Rule | null): void;
  /** Every plate flips open on its real rule. */
  reveal(): void;
  /** The shut plates open for a moment, then shut again. */
  peek(ms: number): void;
  /** ✓ or ✗ on each example, one after another. Null clears it. */
  checks(results: readonly Check[], stagger: number): void;
  hint(what: 'pairs' | 'plates'): void;
  /** The whole contraption wobbles when a try runs out. */
  wobble(): void;
  stop(): void;
}

const plateOf = (host: HTMLElement, slot: number): HTMLElement | null => host.querySelector(`.plate[data-plate="${slot}"]`);

export function createBoard(host: HTMLElement): BoardView {
  let level: Level | null = null;
  let pairListener: (index: number) => void = () => {};
  let plateListener: (slot: number) => void = () => {};
  let slotListener: (slot: SlotId) => void = () => {};
  const timers = new Set<number>();

  function later(ms: number, run: () => void): void {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      run();
    }, ms);
    timers.add(timer);
  }

  function cancel(): void {
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
  }

  /** Restarts a CSS animation by taking its class off and putting it back. */
  function replay(target: Element | null, className: string, ms?: number): void {
    if (!target) return;
    target.classList.remove(className);
    void (target as HTMLElement).offsetWidth;
    target.classList.add(className);
    if (ms) later(ms, () => target.classList.remove(className));
  }

  /** A tap counts on pointerdown, and a keyboard press arrives as a click with no pointer behind it. */
  function tappable(made: HTMLButtonElement, listener: () => void): void {
    made.addEventListener('pointerdown', (event) => {
      if (event.button === 0) listener();
    });
    made.addEventListener('click', (event) => {
      if (event.detail === 0) listener();
    });
  }

  function belt(shown: Level): HTMLElement {
    const strip = element('div', 'belt');
    strip.dataset.count = String(shown.puzzle.examples.length);
    shown.puzzle.examples.forEach((pair, index) => {
      const chip = button('pair');
      chip.dataset.pair = String(index);
      chip.style.setProperty('--at', String(index));
      const arrow = element('span', 'pair-arrow');
      arrow.textContent = '➜';
      chip.append(token('token-sm', pair.from), arrow, token('token-sm', pair.to), element('span', 'pair-mark'));
      chip.setAttribute('aria-label', `${pair.from} → ${pair.to}`);
      tappable(chip, () => pairListener(index));
      strip.append(chip);
    });
    return strip;
  }

  function slotButton(id: SlotId): HTMLElement {
    const holder = element('span', `slot-holder slot-holder-${id}`);
    const made = button(`slot slot-${id}`);
    made.dataset.slot = id;
    made.append(token('token-big', null));
    tappable(made, () => slotListener(id));
    holder.append(made);
    if (id === 'out') holder.append(token('token-big token-got', null));
    return holder;
  }

  function machineBody(slot: number): HTMLElement {
    const body = element('div', 'body');
    const chimney = element('span', 'chimney');
    for (let at = 0; at < 3; at += 1) {
      const puff = element('span', 'puff');
      puff.style.setProperty('--at', String(at));
      chimney.append(puff);
    }
    const eyes = element('span', 'gauges');
    for (let at = 0; at < 2; at += 1) {
      const gauge = element('span', 'gauge');
      gauge.append(element('span', 'needle'));
      eyes.append(gauge);
    }
    const plate = button('plate');
    plate.dataset.plate = String(slot);
    const flap = element('span', 'plate-flap');
    const front = element('span', 'plate-front');
    front.textContent = '?';
    const back = element('span', 'plate-back');
    flap.append(front, back);
    plate.append(flap);
    tappable(plate, () => plateListener(slot));
    // The first machine carries the shift's lamps where the others have vents.
    body.append(chimney, element('span', 'gear gear-a'), element('span', 'gear gear-b'), eyes, plate, element('span', slot === 0 ? 'lamps' : 'vents'));
    return body;
  }

  function works(shown: Level): HTMLElement {
    const count = shown.puzzle.machines.length;
    const area = element('div', 'works');
    area.dataset.machines = String(count);
    shown.puzzle.machines.forEach((_, slot) => {
      const rig = element('div', 'rig');
      rig.dataset.slot = String(slot);
      if (slot === 0) {
        const hopper = element('div', 'hopper');
        hopper.append(slotButton('in'));
        rig.append(hopper);
      }
      rig.append(machineBody(slot));
      if (slot === count - 1) {
        const chute = element('div', 'chute');
        chute.append(element('span', 'chute-tube'), slotButton('out'));
        rig.append(chute);
      }
      if (slot > 0) {
        const pipe = element('div', 'pipe');
        pipe.append(token('token-mid', null));
        area.append(pipe);
      }
      area.append(rig);
    });
    return area;
  }

  function slotToken(id: SlotId): HTMLElement | null {
    return host.querySelector(`.slot-${id} .token`);
  }

  function setPlate(slot: number, rule: Rule | null): void {
    const plate = plateOf(host, slot);
    if (!plate) return;
    const back = plate.querySelector('.plate-back');
    if (rule) back?.replaceChildren(ruleFace(rule));
    plate.dataset.open = String(rule !== null);
  }

  /**
   * The biggest sizes that fit: belt tokens small enough for every example to sit in one row, and the machine unit
   * as big as the room left allows, so tokens and plates stay big on a small phone.
   */
  function layout(): void {
    if (!level) return;
    const strip = host.querySelector<HTMLElement>('.belt');
    if (!strip) return;
    const style = getComputedStyle(host);
    const width = host.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const pairs = level.puzzle.examples.length;
    // A chip is two tokens and about 20px of arrow and padding. The belt adds 32px of rollers and 6px between
    // chips, and a little spare keeps rounding from wrapping the last chip onto a second row.
    const beltRoom = (width - 40 - 6 * (pairs - 1) - 26 * pairs) / (2 * pairs);
    const across = [7.4, 13, 19][level.puzzle.machines.length - 1] ?? 19;
    for (let pass = 0; pass < 2; pass += 1) {
      const unit = parseFloat(host.style.getPropertyValue('--s')) || 30;
      host.style.setProperty('--bt', `${Math.max(34, Math.min(54, unit * 1.25, beltRoom)).toFixed(1)}px`);
      const height = host.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - strip.offsetHeight - 16;
      // Tokens are 2.3 units but never under 64px, and the hopper and chute each hold one. The body is 4.6 units
      // but never under 118px, so its gauges, plate and lamps fit on a narrow machine.
      const fits = (size: number): boolean => {
        const tok = Math.max(64, size * 2.3);
        return 2 * tok + size + Math.max(size * 4.6, 118) <= height;
      };
      let size = Math.min(46, width / across);
      while (size > 16 && !fits(size)) size -= 0.5;
      host.style.setProperty('--s', `${size.toFixed(2)}px`);
    }
  }

  return {
    show(shown) {
      cancel();
      level = shown;
      host.dataset.ask = shown.puzzle.ask;
      host.dataset.machines = String(shown.puzzle.machines.length);
      delete host.dataset.wobble;
      host.replaceChildren(belt(shown), works(shown));
      const { puzzle } = shown;
      puzzle.machines.forEach((rule, slot) => setPlate(slot, puzzle.open[slot] ? rule : null));
      this.setMiddle([]);
      layout();
    },
    layout,
    onPair(listener) {
      pairListener = listener;
    },
    onPlate(listener) {
      plateListener = listener;
    },
    onSlot(listener) {
      slotListener = listener;
    },
    setSlot(id, value, tone = '') {
      const shown = slotToken(id);
      if (!shown) return;
      shown.classList.remove('dropping');
      shown.closest('.slot')?.setAttribute('data-empty', String(value === undefined));
      fillToken(shown, value ?? null);
      shown.dataset.tone = tone;
      if (tone) replay(shown, 'landed');
      shown.closest('.slot')?.setAttribute('aria-label', value === undefined ? '' : value === null ? '?' : String(value));
    },
    showGot(value) {
      const got = host.querySelector<HTMLElement>('.token-got');
      if (!got) return;
      got.hidden = value === undefined;
      if (value === undefined) return;
      fillToken(got, value);
      got.dataset.cant = String(value === null);
      if (value === null) got.querySelector('.digit')!.textContent = '✗';
      replay(got, 'landed');
    },
    drop() {
      replay(slotToken('in'), 'dropping');
    },
    churn(ms, smoke) {
      const rigs = [...host.querySelectorAll<HTMLElement>('.rig')];
      const each = ms / rigs.length;
      rigs.forEach((rig, at) => {
        later(each * at, () => {
          rig.classList.toggle('smoky', smoke);
          replay(rig, 'running', each);
          if (at > 0) replay(host.querySelectorAll('.pipe')[at - 1] ?? null, 'flowing', each);
        });
      });
    },
    setMiddle(values) {
      host.querySelectorAll<HTMLElement>('.token-mid').forEach((middle, at) => {
        const value = values[at];
        middle.hidden = value === undefined;
        if (value !== undefined) fillToken(middle, value);
      });
    },
    setLamps(done, total) {
      const lamps = host.querySelector<HTMLElement>('.lamps');
      if (!lamps) return;
      lamps.replaceChildren(
        ...Array.from({ length: total }, (_, at) => {
          const lamp = element('span', at < done ? 'lamp lamp-on' : at === done ? 'lamp lamp-now' : 'lamp');
          return lamp;
        }),
      );
      lamps.dataset.done = String(done);
      if (done > 0) replay(lamps.children[done - 1] ?? null, 'lamp-lit');
    },
    setPlate,
    reveal() {
      if (!level) return;
      const { puzzle } = level;
      puzzle.machines.forEach((rule, slot) => {
        const plate = plateOf(host, slot);
        const wasShut = plate?.dataset.open !== 'true';
        setPlate(slot, rule);
        plate?.classList.add('solved');
        if (wasShut) replay(plate, 'flipping');
      });
    },
    peek(ms) {
      if (!level) return;
      const { puzzle } = level;
      const shut = puzzle.machines.flatMap((_, slot) => (puzzle.open[slot] ? [] : [slot]));
      for (const slot of shut) {
        setPlate(slot, puzzle.machines[slot]);
        replay(plateOf(host, slot), 'flipping');
      }
      later(ms, () => {
        for (const slot of shut) {
          if (plateOf(host, slot)?.classList.contains('solved')) continue;
          setPlate(slot, null);
        }
      });
    },
    checks(results, stagger) {
      const chips = [...host.querySelectorAll<HTMLElement>('.pair')];
      chips.forEach((chip, at) => {
        const result = results[at] ?? null;
        if (result === null) {
          delete chip.dataset.check;
          return;
        }
        later(stagger * at, () => {
          chip.dataset.check = result ? 'yes' : 'no';
          replay(chip, 'checked');
        });
      });
    },
    hint(what) {
      const targets = what === 'pairs' ? [...host.querySelectorAll('.pair')] : [...host.querySelectorAll('.plate')];
      targets.forEach((target, at) => later(at * 260, () => replay(target, 'hint', 2400)));
    },
    wobble() {
      host.dataset.wobble = 'true';
      if (calm()) return;
      replay(host.querySelector('.works'), 'wobbling');
    },
    stop: cancel,
  };
}

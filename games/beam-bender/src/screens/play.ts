import { burst, say, speak } from '@playroom/kit';
import { askHint } from '../hints.ts';
import { text } from '../lang/index.ts';
import { boardFor, type Level } from '../rules/levels.ts';
import { HINTS_PER_LEVEL, isDisco, startPlay, starsFor, tapPiece, undoMove, useHint, type Play } from '../rules/play.ts';
import { solve } from '../rules/solver.ts';
import { discoSound, fizzleSound, hintSound, litSound, noSound, pickSound, secretSound, slideSound, turnSound, undoSound, winSound } from '../sounds.ts';
import { button, calm, element, onPress } from '../ui.ts';
import type { Rect, View } from '../view/view.ts';
import { pickTipSpot } from './toast.ts';

const WIN_PAUSE_MS = 1000;
const DISCO_PAUSE_MS = 2500;
const LOST_PAUSE_MS = 500;
const TOAST_MS = 3600;
const MOST_COACHED_LEVEL = 2;
const MIN_TAP_PX = 64;
const LOW_MOVES = 2;
/** Room around the outer tiles for the tray's rim, and above them for a laser standing on the far row. */
const RIM_TILES = 0.2;
const TALL_TILES = 0.45;

export interface WinReport {
  level: Level;
  moves: number;
  stars: number;
  hinted: boolean;
}

export interface PlayOptions {
  level: Level;
  view: View;
  piecesHost: HTMLElement;
  meterHost: HTMLElement;
  dockHost: HTMLElement;
  toastHost: HTMLElement;
  safeArea: () => Rect;
  /** Hints spent on this level already. They carry over a retry. */
  hintsSpent: number;
  announce: boolean;
  onHint: (spent: number) => void;
  /** Runs the moment a level is won, so leaving during the party loses nothing. */
  onScore: (report: WinReport) => void;
  /** Runs when the party is over. */
  onWin: (report: WinReport) => void;
  onLoss: () => void;
  onSecret: () => void;
  onStart: () => void;
}

export interface PlayScreen {
  retry(): void;
  relabel(): void;
  stop(): void;
  spoken(): string;
  key(name: string): boolean;
}

function moveFocus(buttons: HTMLButtonElement[], from: Element | null, stepX: number, stepY: number): void {
  const current = buttons.find((item) => item === from);
  if (!current) {
    buttons[0]?.focus();
    return;
  }
  const here = current.getBoundingClientRect();
  let best: HTMLButtonElement | null = null;
  let bestScore = Infinity;
  for (const item of buttons) {
    if (item === current) continue;
    const box = item.getBoundingClientRect();
    const across = (box.left - here.left) * stepX + (box.top - here.top) * stepY;
    if (across <= 1) continue;
    const aside = Math.abs((box.left - here.left) * stepY) + Math.abs((box.top - here.top) * stepX);
    const score = across + aside * 2;
    if (score < bestScore) {
      best = item;
      bestScore = score;
    }
  }
  best?.focus();
}

const ARROWS: Record<string, readonly [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

export function startPlayScreen(options: PlayOptions): PlayScreen {
  const { level, view, piecesHost, meterHost, dockHost, toastHost, safeArea } = options;
  const board = boardFor(level);
  const rules = { par: level.par, limit: level.limit };
  const fresh = (): Play => ({ ...startPlay(board, rules), hints: options.hintsSpent });
  let play = fresh();
  let alive = true;
  let hintPending = false;
  let timers: number[] = [];
  let hinted: number | null = null;
  let toastTimer = 0;

  const later = (ms: number, run: () => void): void => {
    timers.push(window.setTimeout(run, ms));
  };

  // ---- The moves meter ----
  const meter = element('div', 'meter');
  const fill = element('div', 'meter-fill');
  const parMark = element('div', 'meter-par');
  parMark.textContent = '★';
  const left = element('div', 'meter-left');
  const track = element('div', 'meter-track');
  track.append(fill, parMark);
  meter.append(track, left);
  meterHost.replaceChildren(meter);
  parMark.style.left = `${(level.par / level.limit) * 100}%`;

  // ---- The dock ----
  const undo = button('dock-btn');
  const hint = button('dock-btn');
  const retry = button('dock-btn');
  undo.dataset.action = 'undo';
  hint.dataset.action = 'hint';
  retry.dataset.action = 'retry';
  dockHost.replaceChildren(undo, hint, retry);

  // ---- One invisible button over each piece ----
  const hits = board.pieces.map((piece, index) => {
    const hit = button('piece-hit');
    hit.dataset.piece = String(index);
    hit.dataset.kind = piece.kind;
    hit.dataset.x = String(piece.at % board.width);
    hit.dataset.y = String(Math.floor(piece.at / board.width));
    onPress(hit, () => tap(index));
    return hit;
  });
  piecesHost.replaceChildren(...hits);

  function placeHits(): void {
    hits.forEach((hit, index) => {
      const spot = view.tileSpot(board.pieces[index].at);
      const width = Math.max(MIN_TAP_PX, spot.width);
      const height = Math.max(MIN_TAP_PX, spot.height);
      hit.style.left = `${spot.x - width / 2}px`;
      hit.style.top = `${spot.y - height / 2}px`;
      hit.style.width = `${width}px`;
      hit.style.height = `${height}px`;
    });
  }

  function labelHits(): void {
    hits.forEach((hit, index) => {
      const piece = board.pieces[index];
      hit.setAttribute('aria-label', `${text().piece[piece.kind]}, ${text().at(Math.floor(piece.at / board.width) + 1, (piece.at % board.width) + 1)}`);
    });
  }

  function relabel(): void {
    labelHits();
    const { undo: undoWord, hintButton, retry: retryWord } = text();
    undo.innerHTML = `<span aria-hidden="true">↩️</span><small>${undoWord}</small>`;
    hint.innerHTML = `<span aria-hidden="true">💡</span><small>${hintButton} ${HINTS_PER_LEVEL - play.hints}</small>`;
    retry.innerHTML = `<span aria-hidden="true">🔄</span><small>${retryWord}</small>`;
    const movesLeft = Math.max(0, level.limit - play.moves);
    left.textContent = text().movesLeft(movesLeft);
    meter.setAttribute('aria-label', text().moves(play.moves, level.limit));
  }

  function drawStatus(): void {
    const movesLeft = Math.max(0, level.limit - play.moves);
    fill.style.width = `${(movesLeft / level.limit) * 100}%`;
    meter.classList.toggle('meter-low', movesLeft <= LOW_MOVES);
    undo.disabled = play.history.length === 0 || play.status !== 'playing';
    hint.classList.toggle('dock-empty', play.hints >= HINTS_PER_LEVEL);
    const { dataset } = document.body;
    dataset.moves = String(play.moves);
    dataset.limit = String(level.limit);
    dataset.par = String(level.par);
    dataset.status = play.status;
    dataset.hints = String(play.hints);
    dataset.turns = play.frame.turns.join(',');
    dataset.blocks = String(play.frame.blocks);
    hits.forEach((hit, index) => {
      hit.dataset.turn = String(play.frame.turns[index]);
      hit.dataset.lit = String((play.trace.touched >> index) & 1);
    });
    relabel();
  }

  function boardBox(): Rect {
    const last = board.width * board.height - 1;
    const spots = [0, board.width - 1, last - board.width + 1, last].map((at) => view.tileSpot(at));
    const box: Rect = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    for (const { x, y, width, height } of spots) {
      box.left = Math.min(box.left, x - width * (0.5 + RIM_TILES));
      box.right = Math.max(box.right, x + width * (0.5 + RIM_TILES));
      box.top = Math.min(box.top, y - height * (0.5 + TALL_TILES));
      box.bottom = Math.max(box.bottom, y + height * (0.5 + RIM_TILES));
    }
    return box;
  }

  /** Above the board, below it, or beside it under the dock: anywhere but over the board itself. */
  function placeToast(): void {
    const box = boardBox();
    const { innerWidth: width, innerHeight: height } = window;
    const meter = meterHost.getBoundingClientRect();
    const dock = dockHost.getBoundingClientRect();
    const strips: Rect[] = [{ left: 0, top: meter.bottom, right: width, bottom: box.top }];
    if (dock.top >= box.bottom) strips.push({ left: 0, top: box.bottom, right: width, bottom: dock.top });
    if (dock.left >= box.right) strips.push({ left: dock.left, top: dock.bottom, right: dock.right, bottom: height });
    toastHost.style.left = '0px';
    const spot = pickTipSpot(strips, { left: dock.left, top: dock.top, right: dock.right, bottom: height }, (maxWidth) => {
      toastHost.style.maxWidth = `${maxWidth}px`;
      return { width: toastHost.offsetWidth, height: toastHost.offsetHeight };
    });
    toastHost.style.maxWidth = `${spot.maxWidth}px`;
    toastHost.style.left = `${spot.left}px`;
    toastHost.style.top = `${spot.top}px`;
  }

  function showToast(line: string): void {
    toastHost.textContent = line;
    placeToast();
    toastHost.classList.add('toast-on');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastHost.classList.remove('toast-on'), TOAST_MS);
  }

  function hideToast(): void {
    window.clearTimeout(toastTimer);
    toastHost.classList.remove('toast-on');
  }

  function clearHint(): void {
    if (hinted === null) return;
    hits[hinted]?.classList.remove('hinted');
    hinted = null;
  }

  function markPiece(index: number): void {
    clearHint();
    hinted = index;
    hits[index]?.classList.add('hinted');
  }

  function coach(): void {
    if (level.id > MOST_COACHED_LEVEL) return;
    const first = solve(board, play.frame)?.taps[0];
    if (first !== undefined) markPiece(first);
  }

  function cheerTargets(): void {
    if (calm()) return;
    for (const { at } of board.targets) {
      const spot = view.tileSpot(at);
      burst(spot.x, spot.y, 14);
    }
  }

  function finishWin(before: Play): void {
    const disco = isDisco(board, before.trace, play.trace);
    const report: WinReport = { level, moves: play.moves, stars: starsFor(play), hinted: play.hints > 0 };
    options.onScore(report);
    cheerTargets();
    if (disco) {
      view.disco();
      discoSound();
      speak(text().disco);
      document.body.dataset.disco = 'yes';
    } else {
      winSound();
    }
    later(disco ? DISCO_PAUSE_MS : WIN_PAUSE_MS, () => options.onWin(report));
  }

  function finishLoss(): void {
    view.fizzle();
    fizzleSound();
    later(LOST_PAUSE_MS, () => options.onLoss());
  }

  function react(before: Play): void {
    const newlyLit = play.trace.lit & ~before.trace.lit;
    if (newlyLit) litSound(play.trace.lit.toString(2).replaceAll('0', '').length);
    if (play.frame.blocks !== before.frame.blocks) slideSound();
    if (play.secret && !before.secret) {
      secretSound();
      showToast(text().secret);
      speak(text().secret);
      const spot = view.tileSpot(board.secret);
      burst(spot.x, spot.y, 20);
      options.onSecret();
    }
    if (play.status === 'won') finishWin(before);
    else if (play.status === 'lost') finishLoss();
    else if (level.limit - play.moves === 1 && level.limit > 3 && play.moves !== before.moves) {
      showToast(text().lastMove);
      speak(text().lastMove);
    }
  }

  function tap(index: number): void {
    if (play.status !== 'playing') return;
    const before = play;
    play = tapPiece(play, index);
    if (play === before) return;
    turnSound(index);
    clearHint();
    hideToast();
    view.update(play);
    drawStatus();
    react(before);
    if (level.id <= MOST_COACHED_LEVEL && play.status === 'playing') coach();
  }

  function pressUndo(): void {
    if (play.status !== 'playing' || play.history.length === 0) {
      noSound();
      return;
    }
    const before = play;
    play = undoMove(play);
    undoSound();
    clearHint();
    hideToast();
    view.update(play);
    drawStatus();
    react(before);
  }

  async function pressHint(): Promise<void> {
    if (play.status !== 'playing' || hintPending) return;
    if (play.hints >= HINTS_PER_LEVEL) {
      noSound();
      showToast(text().noHints);
      speak(text().noHints);
      return;
    }
    hintPending = true;
    const asked = play;
    const answer = await askHint(level.id, play.frame, level.limit - play.moves);
    hintPending = false;
    if (!alive || asked !== play || play.status !== 'playing') return;
    if (answer === null) {
      noSound();
      retry.classList.add('dock-pulse');
      showToast(text().hintLate);
      speak(text().hintLate);
      return;
    }
    play = useHint(play);
    options.onHint(play.hints);
    hintSound();
    markPiece(answer);
    showToast(text().hint);
    speak(text().hint);
    drawStatus();
  }

  function restart(): void {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
    play = fresh();
    retry.classList.remove('dock-pulse');
    clearHint();
    hideToast();
    delete document.body.dataset.disco;
    view.restart(play);
    drawStatus();
    options.onStart();
    coach();
  }

  onPress(undo, pressUndo);
  onPress(hint, () => void pressHint());
  // A level that just ended shows its card first, so a mashing hand can't skip it.
  function pressRetry(): void {
    if (play.status !== 'playing') return;
    pickSound();
    restart();
  }

  onPress(retry, pressRetry);

  view.onFit(() => {
    if (alive) placeHits();
  });
  view.showLevel(board, play);
  view.frameBoard(safeArea());
  placeHits();
  drawStatus();
  coach();
  if (options.announce) {
    showToast(text().ideas[level.world]);
    void say(text().ideas[level.world], { queue: true });
  }

  return {
    retry: restart,
    relabel,
    spoken: () => text().ideas[level.world],
    stop() {
      alive = false;
      timers.forEach((timer) => window.clearTimeout(timer));
      hideToast();
      piecesHost.replaceChildren();
      meterHost.replaceChildren();
      dockHost.replaceChildren();
    },
    key(name) {
      const step = ARROWS[name];
      if (step) moveFocus(hits, document.activeElement, step[0], step[1]);
      else if (name === 'u') pressUndo();
      else if (name === 'h') void pressHint();
      else if (name === 'r') pressRetry();
      else return false;
      return true;
    },
  };
}

import { describe, expect, it } from 'vitest';
import { parseBoard } from './board.ts';
import { isDisco, startPlay, starsFor, tapPiece, undoMove, useHint, HINTS_PER_LEVEL } from './play.ts';

const easy = (): ReturnType<typeof startPlay> => startPlay(parseBoard(['> . m0', '. . .', '. . t']), { par: 2, limit: 4 });

describe('a try', () => {
  it('counts a tap and turns the piece a quarter turn', () => {
    const play = tapPiece(easy(), 0);
    expect(play).toMatchObject({ moves: 1, status: 'playing' });
    expect(play.frame.turns).toEqual([1]);
  });

  it('wins the moment every target lights', () => {
    const play = tapPiece(tapPiece(easy(), 0), 0);
    expect(play.status).toBe('won');
    expect(tapPiece(play, 0)).toBe(play);
  });

  it('loses when the moves run out', () => {
    let play = startPlay(parseBoard(['> . m0', '. . .', '. . t']), { par: 2, limit: 1 });
    play = tapPiece(play, 0);
    expect(play.status).toBe('lost');
    expect(tapPiece(play, 0)).toBe(play);
    expect(undoMove(play)).toBe(play);
  });

  it('prefers a win on the very last move', () => {
    let play = startPlay(parseBoard(['> . m0', '. . .', '. . t']), { par: 2, limit: 2 });
    play = tapPiece(tapPiece(play, 0), 0);
    expect(play.status).toBe('won');
  });

  it('ignores a tap on a piece that is not there', () => {
    const play = easy();
    expect(tapPiece(play, 5)).toBe(play);
  });
});

describe('undo', () => {
  it('puts the board back and costs no move of its own', () => {
    const before = easy();
    const play = undoMove(tapPiece(before, 0));
    expect(play.moves).toBe(1);
    expect(play.frame.turns).toEqual(before.frame.turns);
    expect(play.trace.lit).toBe(before.trace.lit);
  });

  it('does nothing with nothing to take back', () => {
    const play = easy();
    expect(undoMove(play)).toBe(play);
  });

  it('never loses the try, even with one move left', () => {
    let play = startPlay(parseBoard(['> . m0', '. . .', '. . t']), { par: 2, limit: 2 });
    play = undoMove(tapPiece(play, 0));
    expect(play).toMatchObject({ status: 'playing', moves: 1 });
  });

  it('slides a block back without pressing its switch again', () => {
    const board = parseBoard(['> m1 .', '. xa .', 'A a t']);
    let play = startPlay(board, { par: 1, limit: 9 });
    play = tapPiece(play, 0);
    expect(play.frame.blocks).toBe(1);
    play = undoMove(play);
    expect(play.frame.blocks).toBe(0);
    expect(play.frame.pressed).toBe(0);
  });
});

describe('stars', () => {
  const rules = { par: 10, limit: 14, hints: 0 };

  it('gives 3 for par, 2 for tidy, 1 for anything else', () => {
    expect(starsFor({ ...rules, moves: 10 })).toBe(3);
    expect(starsFor({ ...rules, moves: 12 })).toBe(2);
    expect(starsFor({ ...rules, moves: 14 })).toBe(1);
  });

  it('gives at most 1 after a hint', () => {
    expect(starsFor({ ...rules, moves: 10, hints: 1 })).toBe(1);
  });
});

describe('hints', () => {
  it('stops at the most a level allows', () => {
    let play = easy();
    for (let tap = 0; tap < HINTS_PER_LEVEL + 2; tap += 1) play = useHint(play);
    expect(play.hints).toBe(HINTS_PER_LEVEL);
  });
});

describe('surprises', () => {
  it('finds the hidden target as soon as light crosses it', () => {
    const play = tapPiece(startPlay(parseBoard(['> . m1', '. . .', 't ? m2']), { par: 1, limit: 9 }), 0);
    expect(play.secret).toBe(false);
    const seen = tapPiece(startPlay(parseBoard(['> m1 .', '. ? .', '. . t']), { par: 1, limit: 9 }), 0);
    expect(seen.secret).toBe(true);
  });

  it('throws a disco only when one tap lights every target from none', () => {
    const board = parseBoard(['> m3 .', '. . .', '. s0 t', '. t .']);
    const play = startPlay(board, { par: 1, limit: 9 });
    const won = tapPiece(tapPiece(tapPiece(play, 0), 0), 0);
    expect(won.status).toBe('won');
    expect(isDisco(board, play.trace, won.trace)).toBe(true);
    expect(isDisco(board, won.trace, won.trace)).toBe(false);
  });

  it('never throws a disco for one target', () => {
    const play = easy();
    const won = tapPiece(tapPiece(play, 0), 0);
    expect(isDisco(play.board, play.trace, won.trace)).toBe(false);
  });
});

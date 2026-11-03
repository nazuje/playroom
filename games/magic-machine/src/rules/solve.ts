// The solver. It tries every rule a machine could have, far more than the game ever uses, keeps the ones that
// make every example come out right, and collects what each of those would answer. A puzzle is fair when that
// collection holds exactly one answer.
import { apply, cardKey, hiddenSlots, isRuleAsk, ruleKey, run, type Puzzle, type Rule } from './machine.ts';

/** Adding or taking 1 to 20, and times or divided by 2 to 5. */
export const UNIVERSE: readonly Rule[] = [
  ...Array.from({ length: 20 }, (_, at): Rule => ({ op: 'add', n: at + 1 })),
  ...Array.from({ length: 20 }, (_, at): Rule => ({ op: 'sub', n: at + 1 })),
  ...[2, 3, 4, 5].map((n): Rule => ({ op: 'mul', n })),
  ...[2, 3, 4, 5].map((n): Rule => ({ op: 'div', n })),
];

/** Inputs searched when running a machine backwards, well past the 0 to 20 the game asks for. */
export const SEARCH_TOP = 60;

/**
 * Every way of filling the shut plates that makes every example come out right. Open plates stay as they are. It
 * walks the machines in order carrying every example's number along, and drops a rule as soon as a machine can't
 * take one of them.
 */
export function machinesFitting(puzzle: Puzzle): Rule[][] {
  const options = puzzle.machines.map((rule, at) => (puzzle.open[at] ? [rule] : UNIVERSE));
  const wanted = puzzle.examples.map((pair) => pair.to);
  const found: Rule[][] = [];
  const chain: Rule[] = [];
  const walk = (at: number, values: readonly number[]): void => {
    if (at === options.length) {
      if (values.every((value, index) => value === wanted[index])) found.push([...chain]);
      return;
    }
    for (const rule of options[at]) {
      const next: number[] = [];
      for (const value of values) {
        const made = apply(rule, value);
        if (made === null) break;
        next.push(made);
      }
      if (next.length !== values.length) continue;
      chain[at] = rule;
      walk(at + 1, next);
    }
  };
  walk(0, puzzle.examples.map((pair) => pair.from));
  return found;
}

/** Every input from 0 up to the search top that the machines turn into this number. */
export function inputsFor(machines: readonly Rule[], output: number): number[] {
  return Array.from({ length: SEARCH_TOP + 1 }, (_, at) => at).filter((value) => run(machines, value) === output);
}

/**
 * What each fitting set of machines would answer, as keys: a number for "out" and "in", a rule key for rule
 * questions. A machine that can't work on the number, or a backwards question with no input or more than one,
 * answers "none" or "many", so the puzzle can't count as fair.
 */
export function answerKeys(puzzle: Puzzle): string[] {
  const found = new Set<string>();
  const slots = hiddenSlots(puzzle);
  for (const chain of machinesFitting(puzzle)) {
    if (isRuleAsk(puzzle.ask)) found.add(cardKey(slots.map((at) => chain[at])));
    else if (puzzle.ask === 'out') found.add(String(run(chain, puzzle.given as number) ?? 'none'));
    else {
      const inputs = inputsFor(chain, puzzle.given as number);
      found.add(inputs.length === 1 ? String(inputs[0]) : inputs.length ? 'many' : 'none');
    }
  }
  return [...found];
}

/** How many different rules a shut plate could hide. A single machine with its plate shut must have exactly one. */
export function rulesFor(puzzle: Puzzle, slot: number): string[] {
  return [...new Set(machinesFitting(puzzle).map((chain) => ruleKey(chain[slot])))];
}

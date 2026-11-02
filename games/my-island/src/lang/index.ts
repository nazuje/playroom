import { getLanguage } from '@playroom/kit';
import type { Say } from '../rules/say.ts';
import { en, type Text } from './en.ts';
import { sl } from './sl.ts';

export const text = (): Text => (getLanguage() === 'sl' ? sl : en);

/** The words for a line the rules asked for, in the language in use. */
export function words(say: Say, t: Text = text()): string {
  if ('line' in say) return t.lines[say.line];
  if ('quest' in say) return t.quests[say.quest] ?? '';
  if ('thanks' in say) return t.thanks[say.thanks % t.thanks.length] ?? '';
  if ('needs' in say) return t.needs[say.needs];
  if ('back' in say) return t.backTo[say.back];
  if ('chat' in say) return t.chat[say.chat];
  if ('level' in say) return t.levels[say.level - 2] ?? '';
  return t.areas[say.area];
}

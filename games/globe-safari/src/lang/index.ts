import { getLanguage } from '@playroom/kit';
import { en, type Text } from './en.ts';
import { sl } from './sl.ts';

export const text = (): Text => (getLanguage() === 'sl' ? sl : en);

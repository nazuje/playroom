import { canSpeak, speak } from '@playroom/kit';
import { el } from './dom.ts';

/** A round 🔊 button that says the line again. Returns null when the browser can't speak. */
export function speakerButton(text: string, label = 'Read it to me'): HTMLButtonElement | null {
  if (!canSpeak()) return null;
  const button = el('button', {
    className: 'speaker-btn',
    text: '🔊',
    attrs: { type: 'button', 'aria-label': label, title: label },
    onPress: () => speak(text),
  });
  // The button sits on a card that turns over on click, and repeating a line mustn't turn it.
  button.addEventListener('click', (event) => event.stopPropagation());
  return button;
}

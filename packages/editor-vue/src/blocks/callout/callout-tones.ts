import { CONTENT_TONES, type NuiContentTone } from '@numior/content';
import type { NuiMenuEntry } from '@numior/vue';
import type { NuiEditorMessages } from '../../editor/editor.messages';
import type { NuiEditorBlockContext } from '../block.types';

export const calloutToneOf = (value: unknown): NuiContentTone =>
  CONTENT_TONES.find((tone) => tone === value) ?? 'info';

export const toneEntries = (
  current: NuiContentTone,
  editor: NuiEditorBlockContext,
  texts: NuiEditorMessages,
): NuiMenuEntry[] => [
  {
    type: 'radio-group',
    value: current,
    onChange: (tone) => {
      editor.setAttrs({ tone: calloutToneOf(tone) });
    },
    items: CONTENT_TONES.map((tone) => ({
      value: tone,
      label: texts.toneName({ tone }),
      icon: tone,
    })),
  },
];

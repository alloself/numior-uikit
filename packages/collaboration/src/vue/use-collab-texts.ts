import { useLocale, useMessages } from '@numior/primitives';
import { computed, type ComputedRef } from 'vue';
import { collabMessages, type NuiCollabMessages } from './collab.messages';

type CollabLabels = Partial<Omit<NuiCollabMessages, 'present'>> | undefined;

export interface CollabTexts {
  readonly text: ComputedRef<NuiCollabMessages>;
  readonly timeOf: (value: string) => string;
}

export const useCollabTexts = (labels: () => CollabLabels): CollabTexts => {
  const messages = useMessages(collabMessages);
  const locale = useLocale();

  const text = computed(() => ({ ...messages.value, ...labels() }));

  const formatter = computed(
    () => new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeStyle: 'short' }),
  );

  return { text, timeOf: (value) => formatter.value.format(new Date(value)) };
};

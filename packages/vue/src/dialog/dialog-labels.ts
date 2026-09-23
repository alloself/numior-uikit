import { computed, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { useControlId } from '@numior/primitives';

export interface DialogLabelSources {
  title(): boolean;
  description(): boolean;
}

export interface DialogLabels {
  readonly id: ComputedRef<string>;
  readonly titleId: ComputedRef<string>;
  readonly descriptionId: ComputedRef<string>;
  readonly labelledBy: ComputedRef<string | undefined>;
  readonly describedBy: ComputedRef<string | undefined>;
}

export function useDialogLabels(
  explicitId: MaybeRefOrGetter<string | undefined>,
  has: DialogLabelSources,
): DialogLabels {
  const id = useControlId(explicitId);
  const titleId = computed(() => `${id.value}-title`);
  const descriptionId = computed(() => `${id.value}-description`);
  return {
    id,
    titleId,
    descriptionId,
    labelledBy: computed(() => (has.title() ? titleId.value : undefined)),
    describedBy: computed(() => (has.description() ? descriptionId.value : undefined)),
  };
}

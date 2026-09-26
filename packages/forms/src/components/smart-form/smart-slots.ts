import {
  inject,
  provide,
  type FunctionalComponent,
  type InjectionKey,
  type Slot,
  type Slots,
} from 'vue';

interface SmartSlotProps {
  readonly render: Slot | undefined;
  readonly scope: Record<string, unknown>;
}

const SMART_SLOTS_KEY: InjectionKey<Slots> = Symbol('nui:smart-form-slots');

export const provideSmartSlots = (slots: Slots): void => {
  provide(SMART_SLOTS_KEY, slots);
};

export const useSmartSlots = (): Slots => inject(SMART_SLOTS_KEY, {});

export const SmartSlot: FunctionalComponent<SmartSlotProps> = Object.assign(
  (props: SmartSlotProps, { slots }: { slots: Slots }) =>
    props.render ? props.render(props.scope) : slots.default?.(),
  { props: ['render', 'scope'] },
);

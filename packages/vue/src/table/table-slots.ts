import {
  inject,
  provide,
  type FunctionalComponent,
  type InjectionKey,
  type Slot,
  type Slots,
} from 'vue';

interface TableSlotProps {
  readonly render: Slot | undefined;
  readonly scope: Record<string, unknown>;
}

const TABLE_SLOTS_KEY: InjectionKey<Slots> = Symbol('nui:table-slots');

export const provideTableSlots = (slots: Slots): void => {
  provide(TABLE_SLOTS_KEY, slots);
};

export const useTableSlots = (): Slots => inject(TABLE_SLOTS_KEY, {});

export const TableSlot: FunctionalComponent<TableSlotProps> = Object.assign(
  (props: TableSlotProps, { slots }: { slots: Slots }) =>
    props.render ? props.render(props.scope) : slots.default?.(),
  { props: ['render', 'scope'] },
);

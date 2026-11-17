<template>
  <div ref="root" class="flex flex-col gap-3">
    <div ref="bar" class="flex items-center gap-2">
      <span class="w-10 text-sm text-muted-foreground tabular-nums">{{ address }}</span>
      <div class="min-w-0 flex-1">
        <NuiInput
          :model-value="barText"
          size="sm"
          :aria-label="BAR_LABEL"
          @update:model-value="onInput"
          @focus="onFocus"
          @keydown="onKeydown"
          @blur="onBlur"
        />
      </div>
    </div>
    <NuiTable
      ref="formula-table"
      v-model:active="active"
      v-model:draft="draft"
      :columns="columns"
      :rows="contacts"
      :get-key="keyOf"
      :keep-editing="inBar"
      :column-menu="false"
      :caption="CAPTION"
      @edit="onEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { NuiInput } from '@numior/kit';
import {
  NuiTable,
  columnName,
  type NuiTableCellPosition,
  type NuiTableColumn,
  type NuiTableDraft,
  type NuiTableEditEvent,
  type NuiTableExposed,
} from '@numior/kit/table';
import { customers } from '#demo/customers';

interface Contact {
  readonly id: number;
  name: string;
  city: string;
  phone: string;
}

type Field = (typeof FIELDS)[number];

const FIELDS = ['name', 'city', 'phone'] as const;

const BAR_LABEL = 'Строка формул';
const CAPTION = 'Клиенты';
const LABELS: Readonly<Record<Field, string>> = { name: 'Имя', city: 'Город', phone: 'Телефон' };

const KEYS: Readonly<Record<string, (table: NuiTableExposed) => void>> = {
  Enter: (table) => {
    table.commitEdit('down');
  },
  Escape: (table) => {
    table.cancelEdit();
  },
};

const contacts = ref<Contact[]>(
  customers.slice(0, 4).map(({ id, name, city, phone }) => ({ id, name, city, phone })),
);

const columns: NuiTableColumn<Contact>[] = FIELDS.map((key) => ({
  key,
  label: LABELS[key],
  type: 'text',
  width: 160,
  flex: 1,
  sortable: false,
  filter: false,
  editable: true,
  value: (row) => row[key],
}));

const formulaTable = useTemplateRef<NuiTableExposed>('formula-table');
const root = useTemplateRef<HTMLElement>('root');
const bar = useTemplateRef<HTMLElement>('bar');
const active = ref<NuiTableCellPosition>();
const draft = ref<NuiTableDraft>();

const keyOf = (contact: Contact): number => contact.id;

const isField = (key: string): key is Field => FIELDS.some((field) => field === key);

const valueAt = (cell: NuiTableCellPosition): string => {
  const field = FIELDS[cell.col];
  const row = contacts.value[cell.row];

  return row === undefined || field === undefined ? '' : row[field];
};

const address = computed(() =>
  active.value === undefined ? '' : `${columnName(active.value.col)}${active.value.row + 1}`,
);

const draftText = (value: unknown): string => (typeof value === 'string' ? value : '');

const barText = computed(() => {
  if (draft.value !== undefined) {
    return draftText(draft.value.value);
  }
  return active.value === undefined ? '' : valueAt(active.value);
});

const inBar = (target: Element): boolean => bar.value?.contains(target) === true;

const onEdit = (event: NuiTableEditEvent<Contact>): void => {
  for (const { row, key, value } of event.changes) {
    if (!isField(key)) {
      continue;
    }

    row[key] = typeof value === 'string' ? value : '';
  }
};

const onFocus = (): void => {
  formulaTable.value?.startEdit('append', { focus: false });
};

const onInput = (text: string): void => {
  if (draft.value === undefined) {
    return;
  }

  draft.value = { ...draft.value, value: text };
};

const onKeydown = (event: KeyboardEvent): void => {
  const action = KEYS[event.key];
  const table = formulaTable.value;

  if (action === undefined || table === null) {
    return;
  }

  event.preventDefault();
  action(table);
};

const onBlur = (event: FocusEvent): void => {
  const next = event.relatedTarget;

  if (next instanceof Node && root.value?.contains(next) === true) {
    return;
  }

  formulaTable.value?.commitEdit('blur');
};
</script>

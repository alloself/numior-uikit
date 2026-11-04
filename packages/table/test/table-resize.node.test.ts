// @vitest-environment jsdom
import { computed, ref } from 'vue';
import { describe, expect, it } from 'vite-plus/test';
import { tableLayout } from '../src/table/table-layout';
import { tableMessages } from '../src/table/table.messages';
import { useTableResize } from '../src/table/use-table-resize';
import type { NuiTableColumn, NuiTableWidths } from '../src';
import { PEOPLE_COLUMNS, type Person } from './support/people';

interface Harness {
  readonly widths: () => NuiTableWidths;
  readonly announced: () => string[];
  drag(key: string, dx: number): void;
}

const harness = (room: number, rtl = false): Harness => {
  const widths = ref<NuiTableWidths>({});
  const announced: string[] = [];
  const columns = new Map(PEOPLE_COLUMNS.map((column) => [column.key, column]));

  const columnAt = (key: string): NuiTableColumn<Person> => {
    const column = columns.get(key);

    if (column === undefined) {
      throw new Error(`No column ${key}`);
    }
    return column;
  };

  const layout = computed(() =>
    tableLayout(PEOPLE_COLUMNS, {
      pins: {},
      hidden: [],
      widths: widths.value,
      sticky: true,
      select: false,
      room,
      wrap: true,
    }),
  );

  const resize = useTableResize<Person>({
    widths,
    layout: () => layout.value,
    room: () => room,
    columnAt,
    isRtl: () => rtl,
    messages: computed(() => tableMessages.ru),
    announce: (text) => {
      announced.push(text);
    },
  });

  return {
    widths: () => widths.value,
    announced: () => announced,
    drag: (key, dx) => {
      resize.start(key, new PointerEvent('pointerdown', { button: 0, pointerId: 7, clientX: 300 }));
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX: 300 + dx }));
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, clientX: 300 + dx }));
    },
  };
};

describe('useTableResize', () => {
  it('lets only the dragged column grow while the table scrolls', () => {
    const table = harness(500);

    table.drag('name', 40);
    expect(table.widths()).toEqual({ name: 200 });
    expect(table.announced()).toEqual(['Ширина колонки «Имя»: 200 px']);
  });

  it('trades the width with the next column while the table fits', () => {
    const table = harness(4000);

    table.drag('name', 40);
    expect(table.widths()).toEqual({ name: 200, city: 100 });

    table.drag('name', 200);
    expect(table.widths()).toEqual({ name: 252, city: 48 });
  });

  it('drags a column pinned at the end from its start edge and mirrors the drag in RTL', () => {
    const table = harness(500);

    table.drag('team', -30);
    expect(table.widths()).toEqual({ team: 150 });

    const mirrored = harness(500, true);

    mirrored.drag('name', 40);
    expect(mirrored.widths()).toEqual({ name: 120 });

    mirrored.drag('team', 40);
    expect(mirrored.widths()).toEqual({ name: 120, team: 160 });
  });

  it('ignores secondary buttons and other pointers', () => {
    const table = harness(500);
    const widths = ref<NuiTableWidths>({});

    expect(widths.value).toEqual({});

    table.drag('name', 0);
    expect(table.widths()).toEqual({ name: 160 });
  });
});

import { FloatingPlacement } from '@numior/primitives';
import { computed, shallowRef, watch } from 'vue';
import { DrawingKind, changeChart, type SheetChart } from '../../core';
import { applyLayout } from '../sheet-layout-step';
import { useSheetPopover } from '../use-sheet-popover';
import type { ChartSettings, ChartSettingsOptions } from './drawings.types';

const SELECTED_FRAME = '.nui-spreadsheet__drawing-frame--selected';

const SELECTED_TOOLS = `${SELECTED_FRAME} .nui-spreadsheet__drawing-tools`;

const PANEL_ROOM = 320;

const roomBeside = (frame: Element): boolean => {
  const { left, right } = frame.getBoundingClientRect();

  return Math.max(left, window.innerWidth - right) >= PANEL_ROOM;
};

export const useSheetChartSettings = (options: ChartSettingsOptions): ChartSettings => {
  const popover = useSheetPopover({
    focusStart: options.focusPanel,
    closed: () => undefined,
    back: options.back,
  });

  const chart = computed((): SheetChart | undefined => {
    const content = options.selected()?.drawing.content;

    return content?.kind === DrawingKind.Chart ? content.chart : undefined;
  });

  const placement = shallowRef<FloatingPlacement>(FloatingPlacement.RightStart);

  const show = (): void => {
    const root = options.root.value;
    const frame = root?.querySelector(SELECTED_FRAME) ?? null;
    const beside = frame === null || roomBeside(frame);

    placement.value = beside ? FloatingPlacement.RightStart : FloatingPlacement.BottomEnd;
    popover.holdAnchor(beside ? frame : (root?.querySelector(SELECTED_TOOLS) ?? frame));
    popover.show();
  };

  const change = (next: SheetChart): void => {
    const sheet = options.sheet();
    const id = options.selected()?.drawing.id;

    if (sheet !== undefined && id !== undefined) {
      applyLayout(options.editing, sheet, changeChart(sheet.layout, id, next));
    }
  };

  watch(chart, (shown) => {
    if (shown === undefined) {
      popover.setOpen(false);
    }
  });

  return { popover, chart, placement, show, change };
};

import { test as base } from '@playwright/test';
import { EditorBenchPage } from './pages/editor-bench';
import { SheetBenchPage } from './pages/sheet-bench';
import { TableBenchPage } from './pages/table-bench';
import { TreeBenchPage } from './pages/tree-bench';

interface BenchPages {
  readonly tableBench: TableBenchPage;
  readonly treeBench: TreeBenchPage;
  readonly editorBench: EditorBenchPage;
  readonly sheetBench: SheetBenchPage;
  readonly bookBench: SheetBenchPage;
}

export const test = base.extend<BenchPages>({
  tableBench: async ({ page }, use) => {
    await use(new TableBenchPage(page));
  },
  treeBench: async ({ page }, use) => {
    await use(new TreeBenchPage(page));
  },
  editorBench: async ({ page }, use) => {
    await use(new EditorBenchPage(page));
  },
  sheetBench: async ({ page }, use) => {
    await use(new SheetBenchPage(page));
  },
  bookBench: async ({ page }, use) => {
    await use(new SheetBenchPage(page, 'book'));
  },
});

export { expect } from '@playwright/test';

import { test as base } from '@playwright/test';
import { DocsSite } from './pages/docs';
import { NuxtApp } from './pages/nuxt-app';
import { PlaygroundPage } from './pages/playground';

interface PageObjects {
  readonly playground: PlaygroundPage;
  readonly docs: DocsSite;
  readonly app: NuxtApp;
  readonly buttons: PlaygroundPage['buttons'];
  readonly typography: PlaygroundPage['typography'];
  readonly chrome: PlaygroundPage['chrome'];
  readonly forms: PlaygroundPage['forms'];
  readonly signup: PlaygroundPage['signup'];
  readonly otp: PlaygroundPage['otp'];
  readonly smartForm: PlaygroundPage['smartForm'];
  readonly wizard: PlaygroundPage['wizard'];
  readonly overlays: PlaygroundPage['overlays'];
  readonly feedback: PlaygroundPage['feedback'];
  readonly navigation: PlaygroundPage['navigation'];
  readonly pickers: PlaygroundPage['pickers'];
  readonly intl: PlaygroundPage['intl'];
  readonly dates: PlaygroundPage['dates'];
  readonly upload: PlaygroundPage['upload'];
  readonly layout: PlaygroundPage['layout'];
  readonly data: PlaygroundPage['data'];
  readonly tree: PlaygroundPage['tree'];
  readonly charts: PlaygroundPage['charts'];
  readonly book: PlaygroundPage['book'];
  readonly table: PlaygroundPage['table'];
  readonly tableDetail: PlaygroundPage['tableDetail'];
  readonly tableSheet: PlaygroundPage['tableSheet'];
  readonly tableCells: PlaygroundPage['tableCells'];
  readonly formulas: PlaygroundPage['formulas'];
  readonly tableFlow: PlaygroundPage['tableFlow'];
  readonly editor: PlaygroundPage['editor'];
}

export const test = base.extend<PageObjects>({
  playground: async ({ page }, use) => {
    await use(new PlaygroundPage(page));
  },
  docs: async ({ page }, use) => {
    await use(new DocsSite(page));
  },
  app: async ({ page }, use) => {
    await use(new NuxtApp(page));
  },
  buttons: async ({ playground }, use) => {
    await use(playground.buttons);
  },
  typography: async ({ playground }, use) => {
    await use(playground.typography);
  },
  chrome: async ({ playground }, use) => {
    await use(playground.chrome);
  },
  forms: async ({ playground }, use) => {
    await use(playground.forms);
  },
  signup: async ({ playground }, use) => {
    await use(playground.signup);
  },
  otp: async ({ playground }, use) => {
    await use(playground.otp);
  },
  smartForm: async ({ playground }, use) => {
    await use(playground.smartForm);
  },
  wizard: async ({ playground }, use) => {
    await use(playground.wizard);
  },
  overlays: async ({ playground }, use) => {
    await use(playground.overlays);
  },
  feedback: async ({ playground }, use) => {
    await use(playground.feedback);
  },
  navigation: async ({ playground }, use) => {
    await use(playground.navigation);
  },
  pickers: async ({ playground }, use) => {
    await use(playground.pickers);
  },
  intl: async ({ playground }, use) => {
    await use(playground.intl);
  },
  dates: async ({ playground }, use) => {
    await use(playground.dates);
  },
  upload: async ({ playground }, use) => {
    await use(playground.upload);
  },
  layout: async ({ playground }, use) => {
    await use(playground.layout);
  },
  data: async ({ playground }, use) => {
    await use(playground.data);
  },
  tree: async ({ playground }, use) => {
    await use(playground.tree);
  },
  charts: async ({ playground }, use) => {
    await use(playground.charts);
  },
  book: async ({ playground }, use) => {
    await use(playground.book);
  },
  table: async ({ playground }, use) => {
    await use(playground.table);
  },
  tableDetail: async ({ playground }, use) => {
    await use(playground.tableDetail);
  },
  tableSheet: async ({ playground }, use) => {
    await use(playground.tableSheet);
  },
  tableCells: async ({ playground }, use) => {
    await use(playground.tableCells);
  },
  formulas: async ({ playground }, use) => {
    await use(playground.formulas);
  },
  tableFlow: async ({ playground }, use) => {
    await use(playground.tableFlow);
  },
  editor: async ({ playground }, use) => {
    await use(playground.editor);
  },
});

export { expect } from '@playwright/test';

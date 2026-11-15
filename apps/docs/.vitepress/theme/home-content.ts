export interface HomeAction {
  readonly text: string;
  readonly link: string;
  readonly primary: boolean;
}

export interface HomeLink {
  readonly text: string;
  readonly link: string;
}

export interface HomeSection {
  readonly label: string;
  readonly title: string;
  readonly text: string;
  readonly block: string;
  readonly more?: HomeLink;
}

export interface HomeContent {
  readonly title: string;
  readonly tagline: string;
  readonly actions: readonly HomeAction[];
  readonly install: string;
  readonly screen: string;
  readonly sections: readonly HomeSection[];
}

const SCREEN_BLOCK = 'AppShell';

const ru: HomeContent = {
  title: 'UI-кит для Vue 3',
  tagline:
    'Мы собираем на нём свои продукты: админку CMS, кабинеты, редакторы. Когда чего-то не хватало, мы это дописывали. Теперь он открыт.',
  actions: [
    { text: 'Начать', link: '/guide/getting-started', primary: true },
    { text: 'Компоненты', link: '/components/button', primary: false },
  ],
  install: 'pnpm add @numior/vue @numior/tokens',
  screen: SCREEN_BLOCK,
  sections: [
    {
      label: 'Редактор',
      title: 'Документ собирается из блоков',
      text: 'Наберите «/», и в текст встанет таблица, выноска или колонки.',
      block: 'ProductDescription',
      more: { text: 'Открыть редактор', link: '/editor/' },
    },
    {
      label: 'Совместная работа',
      title: 'Документ правят несколько человек',
      text: 'Каждый видит курсоры соавторов. Правки, сделанные без связи, уходят на сервер, когда она вернётся.',
      block: 'CoEditing',
      more: { text: 'Открыть совместную работу', link: '/editor/collaboration' },
    },
    {
      label: 'Книга',
      title: 'Формулы считаются в браузере',
      text: 'Книга пересчитывает зависимые ячейки при вводе, открывает и сохраняет файлы XLSX.',
      block: 'PriceSheet',
      more: { text: 'Открыть книгу', link: '/spreadsheet/' },
    },
    {
      label: 'Таблица',
      title: 'Разметка остаётся таблицей',
      text: 'Строки и ячейки — элементы таблицы HTML. По ячейкам ходят стрелками, а при прокрутке рисуются только видимые строки.',
      block: 'OrdersTable',
      more: { text: 'Открыть таблицу', link: '/table/' },
    },
    {
      label: 'Графики',
      title: 'По графику ходят стрелками',
      text: 'График получает фокус с клавиатуры: стрелки переходят от точки к точке и показывают подсказку. Книга рисует свои диаграммы этим же движком.',
      block: 'SalesDashboard',
      more: { text: 'Открыть графики', link: '/charts/' },
    },
    {
      label: 'Формы',
      title: 'Правило проверки — функция',
      text: 'Форма знает типы своих полей и подсказывает их в правилах. Схему Zod, Valibot или ArkType она принимает как есть.',
      block: 'ProductForm',
      more: { text: 'Открыть формы', link: '/components/form' },
    },
    {
      label: 'Палитра команд',
      title: 'Горячие клавиши не зависят от раскладки',
      text: 'Сочетание сверяется по положению клавиши: Ctrl+K откроет палитру и на русской раскладке. Палитра ищет по заказам, товарам и действиям.',
      block: 'CommandPalette',
      more: { text: 'Открыть палитру', link: '/components/command' },
    },
  ],
};

const en: HomeContent = {
  title: 'A UI kit for Vue 3',
  tagline:
    'We build our own products on it: the CMS admin, back offices, editors. When something was missing, we added it. Now it is open.',
  actions: [
    { text: 'Get started', link: '/en/guide/getting-started', primary: true },
    { text: 'Components', link: '/en/components/button', primary: false },
  ],
  install: 'pnpm add @numior/vue @numior/tokens',
  screen: SCREEN_BLOCK,
  sections: [
    {
      label: 'Editor',
      title: 'A document is built from blocks',
      text: 'Type "/" and a table, a callout, or columns drop into the text.',
      block: 'ProductDescription',
      more: { text: 'Open the editor', link: '/en/editor/' },
    },
    {
      label: 'Collaboration',
      title: 'Several people edit one document',
      text: 'Everyone sees the carets of the others. Edits made offline go to the server once the connection is back.',
      block: 'CoEditing',
      more: { text: 'Open collaboration', link: '/en/editor/collaboration' },
    },
    {
      label: 'Spreadsheet',
      title: 'Formulas run in the browser',
      text: 'The spreadsheet recalculates dependent cells as you type, and it opens and saves XLSX files.',
      block: 'PriceSheet',
      more: { text: 'Open the spreadsheet', link: '/en/spreadsheet/' },
    },
    {
      label: 'Table',
      title: 'The markup stays a table',
      text: 'Rows and cells are HTML table elements. Arrow keys move across the cells, and scrolling draws only the rows in view.',
      block: 'OrdersTable',
      more: { text: 'Open the table', link: '/en/table/' },
    },
    {
      label: 'Charts',
      title: 'Arrow keys walk a chart',
      text: 'A chart takes keyboard focus: arrow keys move from point to point and show the tooltip. The spreadsheet draws its charts with the same engine.',
      block: 'SalesDashboard',
      more: { text: 'Open the charts', link: '/en/charts/' },
    },
    {
      label: 'Forms',
      title: 'A validation rule is a function',
      text: 'The form knows the types of its fields and suggests them inside rules. It takes a Zod, Valibot, or ArkType schema as it is.',
      block: 'ProductForm',
      more: { text: 'Open forms', link: '/en/components/form' },
    },
    {
      label: 'Command palette',
      title: 'Hotkeys ignore the keyboard layout',
      text: 'A shortcut is matched by the position of the key, so Ctrl+K opens the palette on a Russian layout too. The palette searches orders, products, and actions.',
      block: 'CommandPalette',
      more: { text: 'Open the command palette', link: '/en/components/command' },
    },
  ],
};

export const homeOf = (localeIndex: string): HomeContent => (localeIndex === 'en' ? en : ru);

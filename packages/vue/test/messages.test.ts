import { describe, expect, it } from 'vitest';
import type { NuiMessageCatalog } from '@numior/primitives';
import type { NuiVueMessages } from '../src';
import { alertMessages } from '../src/alert/alert.messages';
import { breadcrumbsMessages } from '../src/breadcrumbs/breadcrumbs.messages';
import { chipMessages } from '../src/chip/chip.messages';
import { comboboxMessages } from '../src/combobox/combobox.messages';
import { dialogMessages } from '../src/dialog/dialog.messages';
import { listMessages } from '../src/list/list.messages';
import { paginationMessages } from '../src/pagination/pagination.messages';
import { selectMessages } from '../src/select/select.messages';
import { sidebarMessages } from '../src/sidebar/sidebar.messages';
import { toastMessages } from '../src/toast/toast.messages';

const catalogs: { readonly [N in keyof NuiVueMessages]: NuiMessageCatalog<N> } = {
  alert: alertMessages,
  breadcrumbs: breadcrumbsMessages,
  chip: chipMessages,
  combobox: comboboxMessages,
  dialog: dialogMessages,
  list: listMessages,
  pagination: paginationMessages,
  select: selectMessages,
  sidebar: sidebarMessages,
  toast: toastMessages,
};

const untranslated = (): string[] =>
  Object.values(catalogs).flatMap((catalog) =>
    Object.entries(catalog.en).flatMap(([key, english]) => {
      const russian: unknown = Reflect.get(catalog.ru, key);
      const path = `${catalog.namespace}.${key}`;

      if (typeof russian !== typeof english) {
        return [`${path}: ${typeof english} in English, ${typeof russian} in Russian`];
      }

      return typeof english === 'string' && (english === '' || russian === english) ? [path] : [];
    }),
  );

describe('built-in texts of @numior/vue', () => {
  it('registers one catalog per namespace under its own name', () => {
    expect(Object.values(catalogs).map((catalog) => catalog.namespace)).toEqual(
      Object.keys(catalogs),
    );
  });

  it('translates every English text into Russian with the same shape', () => {
    expect(untranslated()).toEqual([]);
  });
});

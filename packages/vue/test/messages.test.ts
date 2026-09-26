import { describe, expect, it } from 'vitest';
import type { NuiMessageCatalog } from '@numior/primitives';
import type { NuiVueMessages } from '../src';
import { alertMessages } from '../src/alert/alert.messages';
import { avatarMessages } from '../src/avatar/avatar.messages';
import { breadcrumbsMessages } from '../src/breadcrumbs/breadcrumbs.messages';
import { calendarMessages } from '../src/calendar/calendar.messages';
import { chipMessages } from '../src/chip/chip.messages';
import { comboboxMessages } from '../src/combobox/combobox.messages';
import { datePickerMessages } from '../src/date-picker/date-picker.messages';
import { dialogMessages } from '../src/dialog/dialog.messages';
import { listMessages } from '../src/list/list.messages';
import { numberFieldMessages } from '../src/number-field/number-field.messages';
import { paginationMessages } from '../src/pagination/pagination.messages';
import { selectMessages } from '../src/select/select.messages';
import { sidebarMessages } from '../src/sidebar/sidebar.messages';
import { stepperMessages } from '../src/stepper/stepper.messages';
import { tableMessages } from '../src/table/table.messages';
import { timeFieldMessages } from '../src/time-field/time-field.messages';
import { toastMessages } from '../src/toast/toast.messages';
import { uploadMessages } from '../src/upload/upload.messages';

const catalogs: { readonly [N in keyof NuiVueMessages]: NuiMessageCatalog<N> } = {
  alert: alertMessages,
  avatar: avatarMessages,
  breadcrumbs: breadcrumbsMessages,
  calendar: calendarMessages,
  chip: chipMessages,
  combobox: comboboxMessages,
  datePicker: datePickerMessages,
  dialog: dialogMessages,
  list: listMessages,
  numberField: numberFieldMessages,
  pagination: paginationMessages,
  select: selectMessages,
  sidebar: sidebarMessages,
  stepper: stepperMessages,
  table: tableMessages,
  timeField: timeFieldMessages,
  toast: toastMessages,
  upload: uploadMessages,
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

import { knownNames } from '../../src/vite/styles';
import type { KitManifest } from '../../src/vite/vite.types';

const ICON = '@numior/kit/styles/icon.css';
const BUTTON = '@numior/kit/styles/button.css';
const BADGE = '@numior/kit/styles/badge.css';
const DIALOG = '@numior/kit/styles/dialog.css';
const TABLE = '@numior/kit/table/styles/table.css';

export const SHEETS = { ICON, BUTTON, BADGE, DIALOG, TABLE };

export const MANIFEST: KitManifest = {
  order: [ICON, BUTTON, BADGE, DIALOG, TABLE],
  components: {
    NuiButton: { from: '@numior/kit', styles: [ICON, BUTTON] },
    NuiBadge: { from: '@numior/kit', styles: [BADGE] },
    NuiTable: { from: '@numior/kit/table', styles: [ICON, BUTTON, TABLE] },
  },
  exports: { contentMediaViews: [ICON, BUTTON, DIALOG] },
};

export const KNOWN = knownNames(MANIFEST);

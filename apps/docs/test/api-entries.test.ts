import { describe, expect, it } from 'vite-plus/test';
import { withoutRepeats } from '../.vitepress/theme/api-entries';
import { referenceOf } from './drivers/api-component';

const CATALOG = { namespace: 'collab', texts: { send: { ru: 'Отправить', en: 'Send' } } };

describe('components of one API reference', () => {
  it('show a shared dictionary once, at the first component', () => {
    const shared = { messages: 'collab' };

    const entries = withoutRepeats([
      { component: referenceOf({ name: 'NuiCollabCarets', ...shared }), catalog: CATALOG },
      { component: referenceOf({ name: 'NuiCollabPresence', ...shared }), catalog: CATALOG },
      { component: referenceOf({ name: 'NuiSolo', messages: undefined }), catalog: undefined },
    ]);

    expect(entries.map((entry) => entry.catalog?.namespace)).toEqual([
      'collab',
      undefined,
      undefined,
    ]);
  });
});

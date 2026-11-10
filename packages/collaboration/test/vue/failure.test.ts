import { renderToString } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { CollabFailure } from '../../src';
import { NuiCollabFailure } from '../../src/vue';
import { documentOf } from './comments-adapter';
import { SessionDriver } from './session-driver';

let session: SessionDriver | undefined;

const opened = async (): Promise<SessionDriver> => {
  session = await SessionDriver.mount();
  return session;
};

afterEach(() => {
  session?.unmount();
  session = undefined;
});

describe('a shared document that stopped syncing', () => {
  it('closes for writing and says why when the server refuses a change', async () => {
    const shared = await opened();

    await shared.welcome(documentOf('one', 'two'), 4);
    await shared.insert('X', 2);

    expect(shared.alert).toBeUndefined();
    expect(shared.writable).toBe(true);

    await shared.refuseChange(4);

    expect(shared.alert).toContain('Your changes are no longer sent');
    expect(shared.alert).toContain('The server did not accept one of your changes.');
    expect(shared.alert).toContain('1 change of yours was not sent');
    expect(shared.writable).toBe(false);
    expect(shared.text).toContain('oXne');
  });

  it('opens the document from the server again without the refused change', async () => {
    const shared = await opened();

    await shared.welcome(documentOf('one', 'two'), 4);
    await shared.insert('X', 2);
    await shared.refuseChange(4);
    await shared.openAgain();

    expect(shared.alert).toBeUndefined();
    expect(shared.shown).toBe(false);

    await shared.welcome(documentOf('one', 'two', 'three'), 6);

    expect(shared.helloVersions).toEqual([null, null]);
    expect(shared.text).toBe('onetwothree');
    expect(shared.writable).toBe(true);
  });

  it('offers no way back when the page is older than the document', async () => {
    const shared = await opened();

    await shared.refuseAsOutdated();

    expect(shared.alert).toContain('Reload the page.');
    expect(shared.alert).toContain('The document is read-only until you open it again.');
    expect(shared.offersToOpenAgain).toBe(false);
  });

  it('renders the message on the server', async () => {
    const html = await renderToString(NuiCollabFailure, {
      props: { failure: { reason: CollabFailure.Document, unsent: 3 } },
    });

    expect(html).toContain('A change made by someone else did not fit your copy.');
    expect(html).toContain('3 changes of yours were not sent');
  });
});

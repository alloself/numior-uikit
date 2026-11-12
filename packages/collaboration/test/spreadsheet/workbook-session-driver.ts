import { NuiSpreadsheet } from '@numior/spreadsheet';
import { promiseTimeout } from '@vueuse/core';
import { flushPromises, mount, renderToString, type VueWrapper } from '@vue/test-utils';
import { ClientMessageKind, RejectReason, ServerMessageKind, type ServerMessage } from '../../src';
import { SpreadsheetDriver } from '../../../spreadsheet/test/drivers/spreadsheet';
import { FakeWire } from '../vue/fake-wire';
import WorkbookHost from './WorkbookHost.vue';

export type BookCell = readonly [row: number, col: number, text: string];

Element.prototype.scrollIntoView = () => undefined;

const ANN = { id: 'ann', name: 'Ann' };

const SHEET = 'Plan';

const PRESENCE_PAUSE = 80;

const snapshotOf = (cells: readonly BookCell[]): unknown => ({
  steps: [
    { kind: 'addSheet', name: SHEET, index: 0 },
    {
      kind: 'setCells',
      sheet: SHEET,
      cells: cells.map(([row, col, text]) => ({
        row,
        col,
        content: { kind: 'value', value: { kind: 'string', value: text } },
      })),
    },
  ],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const placeIn = (state: unknown): string | undefined => {
  const place = isRecord(state) ? state['place'] : undefined;
  const selection = isRecord(place) ? place['selection'] : undefined;
  const active = isRecord(selection) ? selection['active'] : undefined;

  return isRecord(place) && isRecord(active)
    ? `${String(place['sheet'])}!${String(active['row'])}:${String(active['col'])}`
    : undefined;
};

export class WorkbookSessionDriver {
  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly wire: FakeWire,
  ) {}

  static async mount(): Promise<WorkbookSessionDriver> {
    const wire = new FakeWire();

    const wrapper = mount(WorkbookHost, {
      attachTo: document.body,
      props: { transport: wire.transport, user: ANN },
    });

    await flushPromises();

    return new WorkbookSessionDriver(wrapper, wire);
  }

  static async renderOnServer(): Promise<number> {
    const wire = new FakeWire();

    await renderToString(WorkbookHost, { props: { transport: wire.transport, user: ANN } });

    return wire.opened;
  }

  private get sheet(): SpreadsheetDriver {
    return SpreadsheetDriver.around(this.wrapper.findComponent(NuiSpreadsheet));
  }

  private async hear(message: ServerMessage): Promise<void> {
    this.wire.hear(message);
    await flushPromises();
  }

  private get lastSeq(): number {
    const steps = this.wire.sent.findLast((message) => message.kind === ClientMessageKind.Steps);

    if (steps?.kind !== ClientMessageKind.Steps) {
      throw new Error('The client sent no steps');
    }
    return steps.seq;
  }

  async welcome(cells: readonly BookCell[], version: number): Promise<void> {
    this.wire.open();

    await this.hear({
      kind: ServerMessageKind.Welcome,
      version,
      snapshot: snapshotOf(cells),
      presence: [],
    });
  }

  async enter(row: number, col: number, text: string): Promise<void> {
    await this.sheet.enter(row, col, text);
    await flushPromises();
  }

  async stepOn(row: number, col: number): Promise<void> {
    await this.sheet.focus(row, col);
    await promiseTimeout(PRESENCE_PAUSE);
  }

  async waitForPresence(): Promise<void> {
    await promiseTimeout(PRESENCE_PAUSE);
  }

  async opensForEditing(row: number, col: number): Promise<boolean> {
    const sheet = this.sheet;

    await sheet.focus(row, col);
    await sheet.press('F2');

    const opened = sheet.editing;

    await sheet.press('Escape');
    return opened;
  }

  text(row: number, col: number): string | undefined {
    return this.sheet.text(row, col);
  }

  async refuseChange(version: number): Promise<void> {
    await this.hear({
      kind: ServerMessageKind.Rejected,
      seq: this.lastSeq,
      reason: RejectReason.Invalid,
      version,
    });
  }

  async openAgain(): Promise<void> {
    await this.wrapper.find('.nui-collab-failure__rejoin').trigger('click');
    await flushPromises();
  }

  get alert(): string | undefined {
    const alert = this.wrapper.find('[role="alert"]');

    return alert.exists() ? alert.text() : undefined;
  }

  get shown(): boolean {
    return this.wrapper.findComponent(NuiSpreadsheet).exists();
  }

  get sentSteps(): number {
    return this.wire.sent.reduce(
      (count, message) => (message.kind === ClientMessageKind.Steps ? count + 1 : count),
      0,
    );
  }

  get helloVersions(): readonly (number | null)[] {
    return this.wire.sent.flatMap((message) =>
      message.kind === ClientMessageKind.Hello ? [message.version] : [],
    );
  }

  get toldPlacesSinceHello(): readonly (string | undefined)[] {
    const hello = this.wire.sent.findLastIndex(
      (message) => message.kind === ClientMessageKind.Hello,
    );

    return this.wire.sent
      .slice(hello + 1)
      .flatMap((message) =>
        message.kind === ClientMessageKind.Presence ? [placeIn(message.state)] : [],
      );
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

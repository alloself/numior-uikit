import { setBlockSpot, type BlockSpot, type DocJSON } from '@numior/editor-core';
import type { NuiEditorApi } from '@numior/editor-vue';
import { promiseTimeout } from '@vueuse/core';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import {
  ClientMessageKind,
  RejectReason,
  ServerErrorCode,
  ServerMessageKind,
  type ServerMessage,
} from '../../src';
import { FakeWire } from './fake-wire';
import SessionHost from './SessionHost.vue';

Element.prototype.scrollIntoView = () => undefined;

const ANN = { id: 'ann', name: 'Ann' };

const PRESENCE_PAUSE = 80;

const isApi = (value: unknown): value is NuiEditorApi =>
  typeof value === 'object' && value !== null && 'run' in value;

const isSpot = (value: unknown): value is BlockSpot =>
  typeof value === 'object' && value !== null && 'block' in value && 'part' in value;

const spotIn = (state: unknown): BlockSpot | undefined => {
  const spot: unknown =
    typeof state === 'object' && state !== null ? Reflect.get(state, 'spot') : undefined;

  return isSpot(spot) ? spot : undefined;
};

export class SessionDriver {
  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly wire: FakeWire,
  ) {}

  static async mount(): Promise<SessionDriver> {
    const wire = new FakeWire();

    const wrapper = mount(SessionHost, {
      attachTo: document.body,
      props: { transport: wire.transport, user: ANN },
    });

    await flushPromises();

    return new SessionDriver(wrapper, wire);
  }

  private get api(): NuiEditorApi {
    const exposed: unknown = Reflect.get(
      this.wrapper.findComponent({ name: 'NuiEditor' }).vm,
      'editor',
    );

    if (!isApi(exposed)) {
      throw new Error('The editor exposes no API');
    }
    return exposed;
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

  async welcome(snapshot: DocJSON, version: number): Promise<void> {
    this.wire.open();

    await this.hear({ kind: ServerMessageKind.Welcome, version, snapshot, presence: [] });
  }

  async refuseAsOutdated(): Promise<void> {
    this.wire.open();

    await this.hear({ kind: ServerMessageKind.Error, code: ServerErrorCode.Schema });
  }

  async insert(text: string, at: number): Promise<void> {
    this.api.run((state, dispatch) => {
      dispatch?.(state.tr.insertText(text, at));
      return true;
    });

    await flushPromises();
  }

  async workIn(block: string, part: readonly string[]): Promise<void> {
    this.api.run(setBlockSpot({ block, part }));

    await promiseTimeout(PRESENCE_PAUSE);
  }

  get toldSpots(): readonly (BlockSpot | undefined)[] {
    return this.wire.sent.flatMap((message) =>
      message.kind === ClientMessageKind.Presence ? [spotIn(message.state)] : [],
    );
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

  get offersToOpenAgain(): boolean {
    return this.wrapper.find('.nui-collab-failure__rejoin').exists();
  }

  get alert(): string | undefined {
    const alert = this.wrapper.find('[role="alert"]');

    return alert.exists() ? alert.text() : undefined;
  }

  get shown(): boolean {
    return this.wrapper.find('[contenteditable]').exists();
  }

  get writable(): boolean {
    return this.wrapper.find('[contenteditable]').attributes('contenteditable') === 'true';
  }

  get text(): string {
    return this.wrapper.find('[contenteditable]').text();
  }

  get helloVersions(): readonly (number | null)[] {
    return this.wire.sent.flatMap((message) =>
      message.kind === ClientMessageKind.Hello ? [message.version] : [],
    );
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

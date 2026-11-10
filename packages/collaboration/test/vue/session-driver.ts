import type { DocJSON } from '@numior/editor-core';
import type { NuiEditorApi } from '@numior/editor-vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import {
  ClientMessageKind,
  RejectReason,
  ServerErrorCode,
  ServerMessageKind,
  type ClientMessage,
  type CollabTransport,
  type ServerMessage,
  type TransportListener,
} from '../../src';
import SessionHost from './SessionHost.vue';

Element.prototype.scrollIntoView = () => undefined;

const ANN = { id: 'ann', name: 'Ann' };

const isApi = (value: unknown): value is NuiEditorApi =>
  typeof value === 'object' && value !== null && 'run' in value;

export class SessionDriver {
  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly wire: { listener: TransportListener | undefined; sent: ClientMessage[] },
  ) {}

  static async mount(): Promise<SessionDriver> {
    const wire: { listener: TransportListener | undefined; sent: ClientMessage[] } = {
      listener: undefined,
      sent: [],
    };

    const transport: CollabTransport = {
      open: (listener) => {
        wire.listener = listener;

        return {
          send: (message) => {
            wire.sent.push(message);
          },
          close: () => {
            listener.closed();
          },
        };
      },
    };

    const wrapper = mount(SessionHost, {
      attachTo: document.body,
      props: { transport, user: ANN },
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
    this.wire.listener?.message(message);
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
    this.wire.listener?.opened();

    await this.hear({ kind: ServerMessageKind.Welcome, version, snapshot, presence: [] });
  }

  async refuseAsOutdated(): Promise<void> {
    this.wire.listener?.opened();

    await this.hear({ kind: ServerMessageKind.Error, code: ServerErrorCode.Schema });
  }

  async insert(text: string, at: number): Promise<void> {
    this.api.run((state, dispatch) => {
      dispatch?.(state.tr.insertText(text, at));
      return true;
    });

    await flushPromises();
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

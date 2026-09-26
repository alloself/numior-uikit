import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, shallowRef, type Ref } from 'vue';
import type { EngineField, FormEngine } from '../../src/engine/engine';
import { createVeeEngine } from '../../src/engine/vee-engine';

interface Slot {
  readonly path: Ref<string>;
  readonly visible: Ref<boolean>;
}

export class EngineHarness<V extends object> {
  static mount<V extends object>(initialValues: V, names: readonly string[]): EngineHarness<V> {
    const fields = new Map<string, EngineField<unknown>>();

    const slots = new Map<string, Slot>(
      names.map((name) => [name, { path: shallowRef(name), visible: shallowRef(true) }]),
    );

    const captured = shallowRef<FormEngine<V> | null>(null);

    const Host = defineComponent({
      setup: () => {
        const engine = createVeeEngine(initialValues);

        const probe = (name: string, slot: Slot) =>
          defineComponent({
            setup: () => {
              fields.set(
                name,
                engine.field<unknown>(
                  () => slot.path.value,
                  () => undefined,
                ),
              );

              return () => h('i');
            },
          });

        const probes = [...slots].map(([name, slot]) => [name, slot, probe(name, slot)] as const);

        captured.value = engine;
        return () =>
          probes
            .filter(([, slot]) => slot.visible.value)
            .map(([name, , Probe]) => h(Probe, { key: name }));
      },
    });

    mount(Host);

    if (!captured.value) {
      throw new Error('the engine was not created');
    }
    return new EngineHarness(captured.value, fields, slots);
  }

  private constructor(
    readonly engine: FormEngine<V>,
    private readonly fields: Map<string, EngineField<unknown>>,
    private readonly slots: Map<string, Slot>,
  ) {}

  field(name: string): EngineField<unknown> {
    const field = this.fields.get(name);

    if (!field) {
      throw new Error(`no field ${name}`);
    }
    return field;
  }

  private slot(name: string): Slot {
    const slot = this.slots.get(name);

    if (!slot) {
      throw new Error(`no slot ${name}`);
    }
    return slot;
  }

  async move(name: string, path: string): Promise<void> {
    this.slot(name).path.value = path;
    await nextTick();
  }

  async toggle(name: string): Promise<void> {
    const { visible } = this.slot(name);

    visible.value = !visible.value;
    await nextTick();
  }

  async tick(): Promise<void> {
    await nextTick();
  }
}

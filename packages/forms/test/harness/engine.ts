import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, shallowRef, type Ref } from 'vue';
import type {
  EngineArray,
  EngineField,
  FormEngine,
  FormEngineFactory,
} from '../../src/engine/engine';

interface Slot {
  readonly path: Ref<string>;
  readonly visible: Ref<boolean>;
}

export class EngineHarness<V extends object> {
  static mount<V extends object>(
    factory: FormEngineFactory,
    initialValues: V,
    names: readonly string[],
    arrays: readonly string[] = [],
  ): EngineHarness<V> {
    const fields = new Map<string, EngineField<unknown>>();
    const lists = new Map<string, EngineArray<unknown>>();

    const slots = new Map<string, Slot>(
      names.map((name) => [name, { path: shallowRef(name), visible: shallowRef(true) }]),
    );

    const captured = shallowRef<FormEngine<V> | null>(null);

    const Host = defineComponent({
      setup: () => {
        const engine = factory(initialValues);

        for (const path of arrays) {
          lists.set(
            path,
            engine.array<unknown>(() => path),
          );
        }

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
    return new EngineHarness(captured.value, fields, lists, slots);
  }

  private constructor(
    readonly engine: FormEngine<V>,
    private readonly fields: Map<string, EngineField<unknown>>,
    private readonly lists: Map<string, EngineArray<unknown>>,
    private readonly slots: Map<string, Slot>,
  ) {}

  field(name: string): EngineField<unknown> {
    const field = this.fields.get(name);

    if (!field) {
      throw new Error(`no field ${name}`);
    }
    return field;
  }

  array(path: string): EngineArray<unknown> {
    const list = this.lists.get(path);

    if (!list) {
      throw new Error(`no array ${path}`);
    }
    return list;
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

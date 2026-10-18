import { mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import type {
  EngineArray,
  EntryState,
  FormEngine,
  FormEngineFactory,
} from '../../src/engine/engine.types';
import { getAt } from '../../src/values/access';
import EngineScene from '../fixtures/EngineScene.vue';
import type { EngineProbe } from '../fixtures/scenes.types';

export class EngineHarness<V extends object> {
  static mount<V extends object>(
    factory: FormEngineFactory,
    initialValues: V,
    names: readonly string[],
    arrays: readonly string[] = [],
  ): EngineHarness<V> {
    const probes = names.map((name) => reactive({ name, path: name, visible: true }));

    const wrapper = mount(EngineScene<V>, {
      props: { factory, initialValues, probes, arrays },
    });

    return new EngineHarness(wrapper.vm.engine, wrapper.vm.fields, wrapper.vm.lists, probes);
  }

  private constructor(
    readonly engine: FormEngine<V>,
    private readonly fields: Map<string, EntryState>,
    private readonly lists: Map<string, EngineArray>,
    private readonly probes: readonly EngineProbe[],
  ) {}

  valueAt(path: string): unknown {
    return getAt(this.engine.values, path);
  }

  field(name: string): EntryState {
    const field = this.fields.get(name);

    if (!field) {
      throw new Error(`no field ${name}`);
    }
    return field;
  }

  array(path: string): EngineArray {
    const list = this.lists.get(path);

    if (!list) {
      throw new Error(`no array ${path}`);
    }
    return list;
  }

  private probe(name: string): EngineProbe {
    const probe = this.probes.find((candidate) => candidate.name === name);

    if (!probe) {
      throw new Error(`no probe ${name}`);
    }
    return probe;
  }

  async move(name: string, path: string): Promise<void> {
    this.probe(name).path = path;
    await nextTick();
  }

  async toggle(name: string): Promise<void> {
    const probe = this.probe(name);

    probe.visible = !probe.visible;
    await nextTick();
  }

  async tick(): Promise<void> {
    await nextTick();
  }
}

import { shallowRef } from 'vue';
import {
  provideDraftCommits,
  provideField,
  useFieldContext,
  useFieldControl,
  type DraftCommits,
  type FieldContext,
  type FieldControl,
  type FieldControlOptions,
  type FieldControlProps,
  type FieldOptions,
} from '../../src';
import { captureSetup, type Capture } from './capture';

export class FieldHarness {
  static inside(options: FieldOptions): FieldHarness {
    return new FieldHarness(
      captureSetup(() => useFieldContext(), { layers: [() => provideField(options)] }),
    );
  }

  static outside(): FieldHarness {
    return new FieldHarness(captureSetup(() => useFieldContext()));
  }

  private constructor(private readonly capture: Capture<FieldContext | null>) {}

  get present(): boolean {
    return this.capture.value !== null;
  }

  private get context(): FieldContext {
    const context = this.capture.value;
    if (!context) {
      throw new Error('No field context was provided');
    }
    return context;
  }

  get id(): string {
    return this.context.id.value;
  }

  get labelId(): string {
    return this.context.labelId.value;
  }

  get labelledBy(): string | undefined {
    return this.context.labelledBy.value;
  }

  get describedBy(): string | undefined {
    return this.context.describedBy.value;
  }

  get invalid(): boolean {
    return this.context.invalid.value;
  }

  get required(): boolean {
    return this.context.required.value;
  }

  get disabled(): boolean {
    return this.context.disabled.value;
  }

  get readonly(): boolean {
    return this.context.readonly.value;
  }

  get labelable(): boolean {
    return this.context.labelable.value;
  }
}

export class ControlHarness {
  static inside(
    field: FieldOptions | null,
    props: FieldControlProps = {},
    options: FieldControlOptions = {},
  ): ControlHarness {
    const capture = captureSetup(
      () => useFieldControl(() => props, options),
      field ? { layers: [() => provideField(field)] } : {},
    );

    return new ControlHarness(capture.value);
  }

  private constructor(private readonly control: FieldControl) {}

  get id(): string {
    return this.control.attrs.value.id;
  }

  get describedBy(): string | undefined {
    return this.control.attrs.value['aria-describedby'];
  }

  get ariaInvalid(): 'true' | undefined {
    return this.control.attrs.value['aria-invalid'];
  }

  get required(): boolean {
    return this.control.attrs.value.required;
  }

  get disabled(): boolean {
    return this.control.attrs.value.disabled;
  }

  get readonly(): boolean {
    return this.control.attrs.value.readonly;
  }

  get ariaReadonly(): 'true' | undefined {
    return this.control.attrs.value['aria-readonly'];
  }

  get own(): boolean {
    return this.control.own.value;
  }

  get labelledBy(): string | undefined {
    return this.control.field.value?.labelledBy.value;
  }

  get frameField(): string {
    return this.control.frame.value.field.id.value;
  }
}

export class DraftHarness {
  static mount(commit: () => void): DraftHarness {
    const drafts = shallowRef<DraftCommits | null>(null);

    const capture = captureSetup(() => useFieldControl(() => ({}), { commit }), {
      layers: [
        () => {
          drafts.value = provideDraftCommits();
        },
      ],
    });

    if (!drafts.value) {
      throw new Error('the draft commits were not provided');
    }
    return new DraftHarness(drafts.value, capture);
  }

  private constructor(
    private readonly drafts: DraftCommits,
    private readonly capture: Capture<FieldControl>,
  ) {}

  flush(): void {
    this.drafts.commitAll();
  }

  unmount(): void {
    this.capture.wrapper.unmount();
  }
}

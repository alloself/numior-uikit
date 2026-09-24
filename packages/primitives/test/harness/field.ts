import {
  provideField,
  useField,
  useFieldControl,
  type FieldContext,
  type FieldControl,
  type FieldControlOptions,
  type FieldControlProps,
  type FieldOptions,
} from '../../src';
import { captureSetup, providing, type Capture } from './capture';

export class FieldHarness {
  static inside(options: FieldOptions): FieldHarness {
    return new FieldHarness(
      captureSetup(() => useField(), { wrap: providing(() => provideField(options)) }),
    );
  }

  static outside(): FieldHarness {
    return new FieldHarness(captureSetup(() => useField()));
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
      field ? { wrap: providing(() => provideField(field)) } : {},
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
}

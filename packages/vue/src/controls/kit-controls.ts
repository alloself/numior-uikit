import {
  anyOf,
  control,
  controlProps,
  defineControls,
  isBoolean,
  isNumber,
  isString,
  isUnknown,
  listOf,
  nullable,
  oneOf,
  optional,
  shapeOf,
} from '@numior/primitives';
import NuiCheckbox from '../checkbox/NuiCheckbox.vue';
import NuiCombobox from '../combobox/NuiCombobox.vue';
import NuiDatePicker from '../date-picker/NuiDatePicker.vue';
import NuiDateRangePicker from '../date-picker/NuiDateRangePicker.vue';
import NuiInput from '../input/NuiInput.vue';
import NuiNumberField from '../number-field/NuiNumberField.vue';
import NuiOtpField from '../otp-field/NuiOtpField.vue';
import NuiRadioGroup from '../radio/NuiRadioGroup.vue';
import NuiSelect from '../select/NuiSelect.vue';
import NuiSwitch from '../switch/NuiSwitch.vue';
import NuiTextarea from '../textarea/NuiTextarea.vue';
import NuiTimeField from '../time-field/NuiTimeField.vue';

export type NuiKitControls = typeof kitControls;

const size = optional(oneOf('sm', 'md', 'lg'));
const text = optional(isString);
const flag = optional(isBoolean);
const amount = optional(isNumber);

const option = shapeOf({
  value: isUnknown,
  label: isString,
  description: text,
  disabled: flag,
});

const group = shapeOf({ label: isString, items: listOf(option) });
const options = listOf(anyOf(option, group));

export const kitControls = defineControls({
  text: control(NuiInput, isString, {
    props: controlProps({
      type: optional(oneOf('text', 'email', 'tel', 'url', 'password', 'search')),
      placeholder: text,
      mask: text,
      size,
    }),
  }),
  textarea: control(NuiTextarea, isString, {
    props: controlProps({
      rows: amount,
      resize: optional(oneOf('none', 'vertical', 'horizontal', 'both')),
      placeholder: text,
      size,
    }),
  }),
  number: control(NuiNumberField, nullable(isNumber), {
    props: controlProps({ min: amount, max: amount, step: amount, steppers: flag, size }),
  }),
  select: control(NuiSelect, isUnknown, {
    props: controlProps({ options, multiple: flag, clearable: flag, placeholder: text, size }),
  }),
  combobox: control(NuiCombobox, isUnknown, {
    props: controlProps({ options, multiple: flag, clearable: flag, placeholder: text, size }),
  }),
  checkbox: control(NuiCheckbox, isBoolean, { props: controlProps({ label: text, size }) }),
  switch: control(NuiSwitch, isBoolean, { props: controlProps({ label: text, size }) }),
  radio: control(NuiRadioGroup, isUnknown, {
    props: controlProps({
      options: listOf(option),
      orientation: optional(oneOf('vertical', 'horizontal')),
      size,
    }),
  }),
  date: control(NuiDatePicker, nullable(isString), {
    props: controlProps({
      min: text,
      max: text,
      clearable: flag,
      time: flag,
      placeholder: text,
      size,
    }),
  }),
  dateRange: control(
    NuiDateRangePicker,
    shapeOf({ start: nullable(isString), end: nullable(isString) }),
    { props: controlProps({ min: text, max: text, clearable: flag, size }) },
  ),
  time: control(NuiTimeField, nullable(isString), {
    props: controlProps({ seconds: flag, step: amount, min: text, max: text, size }),
  }),
  otp: control(NuiOtpField, isString, {
    props: controlProps({
      length: amount,
      groupSize: amount,
      charset: optional(oneOf('digits', 'alphanumeric')),
      secret: flag,
      placeholder: text,
      webOtp: flag,
      size,
    }),
  }),
});

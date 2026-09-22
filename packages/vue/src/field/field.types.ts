export interface NuiFieldProps {
  /** Id of the labelled control; generated when omitted. */
  id?: string | undefined;
  label?: string | undefined;
  description?: string | undefined;
  /** Error text; when present the field and its control become invalid. */
  error?: string | undefined;
  invalid?: boolean | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  /** Render a fieldset with a legend for a group of controls such as a radio group. */
  group?: boolean | undefined;
}

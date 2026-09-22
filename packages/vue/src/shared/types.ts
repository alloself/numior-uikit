export type NuiSize = 'sm' | 'md' | 'lg';

export type NuiTone =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

export interface NuiFieldControlProps {
  id?: string | undefined;
  size?: NuiSize | undefined;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
  invalid?: boolean | undefined;
}

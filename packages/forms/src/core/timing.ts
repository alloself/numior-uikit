import type { ValidateOn } from './form.types';

export const validatesOnChange = (mode: ValidateOn, attempted: boolean): boolean =>
  mode === 'change' || attempted;

export const validatesOnBlur = (mode: ValidateOn, attempted: boolean): boolean =>
  mode !== 'submit' || attempted;

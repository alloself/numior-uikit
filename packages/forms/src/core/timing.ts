import { ValidateOn } from './form.types';

export const validatesOnChange = (mode: ValidateOn, attempted: boolean): boolean =>
  mode === ValidateOn.Change || attempted;

export const validatesOnBlur = (mode: ValidateOn, attempted: boolean): boolean =>
  mode !== ValidateOn.Submit || attempted;

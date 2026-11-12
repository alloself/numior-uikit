import { PopoverState } from '@numior/primitives';

export const popoverShown = (event: Event): boolean =>
  'newState' in event && event.newState === PopoverState.Open;

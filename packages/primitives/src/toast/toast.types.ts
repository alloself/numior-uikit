export type TimerState = (typeof TimerState)[keyof typeof TimerState];

export type ToastHold = (typeof ToastHold)[keyof typeof ToastHold];

export type ToastTone = (typeof ToastTone)[keyof typeof ToastTone];

export const TimerState = { Running: 'running', Paused: 'paused' } as const;

export const ToastHold = { Hover: 'hover', Focus: 'focus', Hidden: 'hidden' } as const;

export const ToastTone = {
  Neutral: 'neutral',
  Info: 'info',
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
} as const;

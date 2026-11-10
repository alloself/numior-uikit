export type TimerState = (typeof TimerState)[keyof typeof TimerState];

export type ToastHold = (typeof ToastHold)[keyof typeof ToastHold];

export const TimerState = { Running: 'running', Paused: 'paused' } as const;

export const ToastHold = { Hover: 'hover', Focus: 'focus', Hidden: 'hidden' } as const;

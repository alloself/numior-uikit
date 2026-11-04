export type TimerState = (typeof TimerState)[keyof typeof TimerState];

export const TimerState = { Running: 'running', Paused: 'paused' } as const;

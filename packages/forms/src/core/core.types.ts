export type Trigger = (typeof Trigger)[keyof typeof Trigger];

export type ApplyScope = (typeof ApplyScope)[keyof typeof ApplyScope];

export type EntryKind = (typeof EntryKind)[keyof typeof EntryKind];

export type AsyncPhaseKind = (typeof AsyncPhaseKind)[keyof typeof AsyncPhaseKind];

export type SubmissionPhase = (typeof SubmissionPhase)[keyof typeof SubmissionPhase];

export type IssueTargetKind = (typeof IssueTargetKind)[keyof typeof IssueTargetKind];

export const Trigger = { Change: 'change', Blur: 'blur' } as const;

export const ApplyScope = { Attempted: 'attempted', Own: 'own' } as const;

export const EntryKind = { Field: 'field', Array: 'array', Group: 'group' } as const;

export const AsyncPhaseKind = {
  Idle: 'idle',
  Debouncing: 'debouncing',
  Running: 'running',
} as const;

export const SubmissionPhase = {
  Idle: 'idle',
  Running: 'running',
  Succeeded: 'succeeded',
} as const;

export const IssueTargetKind = { Owner: 'owner', Form: 'form', Ignored: 'ignored' } as const;

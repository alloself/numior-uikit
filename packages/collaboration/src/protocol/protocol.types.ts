import type { SchemaStamp } from '@numior/editor-core';

export type RejectReason = (typeof RejectReason)[keyof typeof RejectReason];

export type ServerErrorCode = (typeof ServerErrorCode)[keyof typeof ServerErrorCode];

export interface WireStep {
  readonly kind: string;
  readonly [field: string]: unknown;
}

export interface HelloMessage {
  readonly kind: typeof ClientMessageKind.Hello;
  readonly doc: string;
  readonly clientId: string;
  readonly version: number | null;
  readonly schema: SchemaStamp;
}

export interface SendStepsMessage {
  readonly kind: typeof ClientMessageKind.Steps;
  readonly seq: number;
  readonly version: number;
  readonly steps: readonly WireStep[];
}

export interface PullMessage {
  readonly kind: typeof ClientMessageKind.Pull;
  readonly from: number;
}

export type ClientMessage = HelloMessage | SendStepsMessage | PullMessage;

export interface WelcomeMessage {
  readonly kind: typeof ServerMessageKind.Welcome;
  readonly version: number;
  readonly snapshot?: unknown;
}

export interface AcceptedMessage {
  readonly kind: typeof ServerMessageKind.Accepted;
  readonly seq: number;
  readonly version: number;
}

export interface RejectedMessage {
  readonly kind: typeof ServerMessageKind.Rejected;
  readonly seq: number;
  readonly reason: RejectReason;
  readonly version: number;
}

export interface StepsMessage {
  readonly kind: typeof ServerMessageKind.Steps;
  readonly version: number;
  readonly clientId: string;
  readonly steps: readonly WireStep[];
}

export interface ErrorMessage {
  readonly kind: typeof ServerMessageKind.Error;
  readonly code: ServerErrorCode;
}

export type ServerMessage =
  | WelcomeMessage
  | AcceptedMessage
  | RejectedMessage
  | StepsMessage
  | ErrorMessage;

export const ClientMessageKind = { Hello: 'hello', Steps: 'steps', Pull: 'pull' } as const;

export const ServerMessageKind = {
  Welcome: 'welcome',
  Accepted: 'accepted',
  Rejected: 'rejected',
  Steps: 'steps',
  Error: 'error',
} as const;

export const RejectReason = { Stale: 'stale', Invalid: 'invalid' } as const;

export const ServerErrorCode = { Schema: 'schema', Protocol: 'protocol' } as const;

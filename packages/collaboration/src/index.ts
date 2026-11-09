export type { DocumentVersion, HistoryAdapter, NewDocumentVersion } from './history/history.types';
export { createCollabClient } from './client/client';
export { CollabFailure, CollabStatusKind } from './client/client.types';
export type {
  CollabBatch,
  CollabClient,
  CollabClientOptions,
  CollabDocument,
  CollabPersistence,
  CollabRestored,
  CollabRetry,
  CollabStatus,
  CollabTracking,
  CollabTransport,
  TransportConnection,
  TransportListener,
} from './client/client.types';
export { webSocketTransport } from './client/web-socket-transport';
export { collab, collabVersion, confirmSteps, receiveSteps, sendableSteps } from './editor/collab';
export type {
  CollabOptions,
  CollabState,
  EditorCollabOptions,
  RestoredDocument,
  UnconfirmedStep,
} from './editor/collab.types';
export { restoredDocument } from './editor/restored';
export { CommentEventKind } from './comments/comments.types';
export type {
  CommentAnchor,
  CommentEvent,
  CommentReply,
  CommentThread,
  CommentsAdapter,
  NewComment,
  NewReply,
} from './comments/comments.types';
export { editorCollabDocument } from './editor/editor-document';
export {
  presenceOf,
  remotePeers,
  remotePresence,
  samePresence,
  setRemotePresence,
} from './editor/presence';
export type {
  BlockPoint,
  EditorPresence,
  PresenceSelection,
  PresenceUser,
  RemotePeer,
} from './editor/presence.types';
export {
  ClientMessageKind,
  RejectReason,
  ServerErrorCode,
  ServerMessageKind,
} from './protocol/protocol.types';
export type {
  AcceptedMessage,
  ClientMessage,
  ErrorMessage,
  HelloMessage,
  PeerPresence,
  PresenceMessage,
  PullMessage,
  RejectedMessage,
  SendPresenceMessage,
  SendStepsMessage,
  ServerMessage,
  StepsMessage,
  WelcomeMessage,
  WireStep,
} from './protocol/protocol.types';
export { parseServerMessage } from './protocol/server-messages';

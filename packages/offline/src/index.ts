export { offlinePersistence } from './persistence/offline-persistence';
export { deleteOfflineDocument, openOfflineStore } from './store/offline-store';
export { OfflineCopy } from './store/store.types';
export type {
  OfflineChannel,
  OfflineChannelFactory,
  OfflineLocks,
  OfflineMeta,
  OfflineMigration,
  OfflineOutbox,
  OfflinePersistenceOptions,
  OfflinePlugins,
  OfflineSnapshot,
  OfflineState,
  OfflineStep,
  OfflineStore,
  OfflineStoreOptions,
} from './store/store.types';

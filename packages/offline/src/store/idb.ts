export const requested = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.addEventListener('success', () => {
      resolve(request.result);
    });

    request.addEventListener('error', () => {
      reject(request.error ?? new Error('The IndexedDB request failed'));
    });
  });

export const finished = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    const failed = (): void => {
      reject(transaction.error ?? new Error('The IndexedDB transaction failed'));
    };

    transaction.addEventListener('complete', () => {
      resolve();
    });

    transaction.addEventListener('abort', failed);
    transaction.addEventListener('error', failed);
  });

export const openDatabase = (
  factory: IDBFactory,
  name: string,
  version: number,
  upgrade: (database: IDBDatabase) => void,
): Promise<IDBDatabase> => {
  const request = factory.open(name, version);

  request.addEventListener('upgradeneeded', () => {
    upgrade(request.result);
  });

  return requested(request);
};

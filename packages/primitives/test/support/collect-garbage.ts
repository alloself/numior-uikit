import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { promiseTimeout } from '@vueuse/core';

setFlagsFromString('--expose-gc');

const collector: unknown = runInNewContext('gc');

export const collectGarbage = async (): Promise<void> => {
  if (typeof collector !== 'function') {
    throw new TypeError('The engine gives no garbage collector to the tests');
  }

  await promiseTimeout(0);
  collector();
};

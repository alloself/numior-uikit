import { klona } from 'klona/full';
import { toRaw } from 'vue';

export const cloneValue = <T>(value: T): T => klona(toRaw(value));

import { seeded } from '#demo/random';

export const orders = [{ id: 1, customer: 'Peter Wolfe', total: 249 + seeded(1)() }];

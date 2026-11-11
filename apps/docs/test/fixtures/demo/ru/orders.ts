import { seeded } from '#demo/random';

export const orders = [{ id: 1, customer: 'Пётр Волков', total: 18900 + seeded(1)() }];

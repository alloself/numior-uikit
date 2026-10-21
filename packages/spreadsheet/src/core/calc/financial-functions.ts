import { numberValue } from '../values';
import { numbersOf } from './aggregate';
import type { FunctionArgs, FunctionSpec } from './calc.types';
import { raise, toNumber } from './coerce';
import { defineFunction } from './registry';

const ITERATIONS = 100;

const PRECISION = 1e-12;

const DAYS_IN_YEAR = 365;

interface Annuity {
  readonly rate: number;
  readonly periods: number;
  readonly payment: number;
  readonly present: number;
  readonly future: number;
  readonly due: boolean;
}

const growth = (rate: number, periods: number): number => (1 + rate) ** periods;

const annuityFactor = (rate: number, periods: number, due: boolean): number =>
  rate === 0 ? periods : ((1 + rate * Number(due)) * (growth(rate, periods) - 1)) / rate;

const balance = ({ rate, periods, payment, present, future, due }: Annuity): number =>
  present * growth(rate, periods) + payment * annuityFactor(rate, periods, due) + future;

const finite = (value: number): number => (Number.isFinite(value) ? value : raise('#NUM!'));

const paymentOf = ({ rate, periods, present, future, due }: Annuity): number =>
  periods === 0
    ? raise('#NUM!')
    : -(present * growth(rate, periods) + future) / annuityFactor(rate, periods, due);

const futureOf = ({ rate, periods, payment, present, due }: Annuity): number =>
  -(present * growth(rate, periods) + payment * annuityFactor(rate, periods, due));

const presentOf = ({ rate, periods, payment, future, due }: Annuity): number =>
  -(future + payment * annuityFactor(rate, periods, due)) / growth(rate, periods);

const periodsOf = ({ rate, payment, present, future, due }: Annuity): number => {
  if (rate === 0) {
    return payment === 0 ? raise('#NUM!') : -(present + future) / payment;
  }

  const scaled = (payment * (1 + rate * Number(due))) / rate;

  return Math.log((scaled - future) / (scaled + present)) / Math.log(1 + rate);
};

const interestOf = (annuity: Annuity, period: number): number => {
  if (period < 1 || period > annuity.periods) {
    return raise('#NUM!');
  }

  const payment = paymentOf(annuity);

  if (period === 1) {
    return annuity.due ? 0 : -annuity.present * annuity.rate;
  }
  return annuity.due
    ? (futureOf({ ...annuity, periods: period - 2, payment }) - payment) * annuity.rate
    : futureOf({ ...annuity, periods: period - 1, payment }) * annuity.rate;
};

const newton = (
  value: (rate: number) => number,
  slope: (rate: number) => number,
  guess: number,
): number => {
  let rate = guess;

  for (let step = 0; step < ITERATIONS; step += 1) {
    const delta = value(rate) / slope(rate);

    if (!Number.isFinite(delta)) {
      return raise('#NUM!');
    }
    rate -= delta;
    if (rate <= -1) {
      return raise('#NUM!');
    }
    if (Math.abs(delta) <= PRECISION * Math.max(1, Math.abs(rate))) {
      return rate;
    }
  }
  return raise('#NUM!');
};

type AnnuitySlot = keyof Annuity | 'period';

const PAYMENT_ORDER = ['rate', 'periods', 'present', 'future', 'due'] as const;

const FUTURE_ORDER = ['rate', 'periods', 'payment', 'present', 'due'] as const;

const PRESENT_ORDER = ['rate', 'periods', 'payment', 'future', 'due'] as const;

const PERIODS_ORDER = ['rate', 'payment', 'present', 'future', 'due'] as const;

const RATE_ORDER = ['periods', 'payment', 'present', 'future', 'due'] as const;

const PERIOD_ORDER = ['rate', 'period', 'periods', 'present', 'future', 'due'] as const;

const CUMULATIVE_ORDER = ['rate', 'periods', 'present'] as const;

const annuityArgs = (args: FunctionArgs, order: readonly AnnuitySlot[]): Annuity => {
  const read = (key: keyof Annuity, fallback: number): number => {
    const index = order.indexOf(key);

    return index < 0 ? fallback : args.number(index, fallback);
  };

  return {
    rate: read('rate', 0),
    periods: read('periods', 0),
    payment: read('payment', 0),
    present: read('present', 0),
    future: read('future', 0),
    due: read('due', 0) !== 0,
  };
};

const rateSlope =
  (annuity: Annuity) =>
  (rate: number): number => {
    const step = 1e-6 * Math.max(1, Math.abs(rate));

    return (
      (balance({ ...annuity, rate: rate + step }) - balance({ ...annuity, rate: rate - step })) /
      (2 * step)
    );
  };

const rateOf = (annuity: Annuity, guess: number): number =>
  newton((rate) => balance({ ...annuity, rate }), rateSlope(annuity), guess);

const discounted = (rate: number, flows: readonly number[], times: readonly number[]): number =>
  flows.reduce((total, flow, index) => total + flow / growth(rate, times[index] ?? index), 0);

const discountSlope = (rate: number, flows: readonly number[], times: readonly number[]): number =>
  flows.reduce((total, flow, index) => {
    const time = times[index] ?? index;

    return total - (time * flow) / growth(rate, time + 1);
  }, 0);

const following = (flows: readonly number[]): number[] => flows.map((_, index) => index + 1);

const bothSigns = (flows: readonly number[]): boolean =>
  flows.some((flow) => flow > 0) && flows.some((flow) => flow < 0);

const returnOf = (flows: readonly number[], times: readonly number[], guess: number): number =>
  bothSigns(flows)
    ? newton(
        (rate) => discounted(rate, flows, times),
        (rate) => discountSlope(rate, flows, times),
        guess,
      )
    : raise('#NUM!');

const listOf = (args: FunctionArgs, index: number): number[] =>
  args.matrix(index).flat().map(toNumber);

interface DatedFlows {
  readonly flows: readonly number[];
  readonly times: readonly number[];
}

const datedFlows = (args: FunctionArgs, from: number): DatedFlows => {
  const flows = listOf(args, from);
  const dates = listOf(args, from + 1).map(Math.floor);
  const first = dates[0] ?? raise('#NUM!');

  if (flows.length !== dates.length || dates.some((date) => date < first)) {
    return raise('#NUM!');
  }
  return { flows, times: dates.map((date) => (date - first) / DAYS_IN_YEAR) };
};

const modifiedReturn = (flows: readonly number[], finance: number, reinvest: number): number => {
  const count = flows.length;
  const times = following(flows);

  const gains = discounted(
    reinvest,
    flows.map((flow) => Math.max(flow, 0)),
    times,
  );

  const costs = discounted(
    finance,
    flows.map((flow) => Math.min(flow, 0)),
    times,
  );

  if (gains === 0 || costs === 0) {
    return raise('#DIV/0!');
  }
  return ((-gains * growth(reinvest, count)) / (costs * (1 + finance))) ** (1 / (count - 1)) - 1;
};

const declining = (
  cost: number,
  salvage: number,
  life: number,
  period: number,
  months: number,
): number => {
  const rate = Math.round((1 - (salvage / cost) ** (1 / life)) * 1000) / 1000;
  let total = (cost * rate * months) / 12;

  if (period === 1) {
    return total;
  }
  for (let step = 2; step <= Math.min(period, life); step += 1) {
    const current = (cost - total) * rate;

    if (step === period) {
      return current;
    }
    total += current;
  }
  return ((cost - total) * rate * (12 - months)) / 12;
};

const decliningArgs = (args: FunctionArgs): number => {
  const cost = args.number(0);
  const salvage = args.number(1);
  const life = args.number(2);
  const period = Math.trunc(args.number(3));
  const months = Math.trunc(args.number(4, 12));
  const last = months === 12 ? life : life + 1;

  if (cost < 0 || salvage < 0 || life <= 0 || period < 1 || period > last) {
    return raise('#NUM!');
  }
  if (months < 1 || months > 12) {
    return raise('#NUM!');
  }
  return cost === 0 ? 0 : declining(cost, salvage, life, period, months);
};

const doubleDeclining = (args: FunctionArgs): number => {
  const cost = args.number(0);
  const salvage = args.number(1);
  const life = args.number(2);
  const period = args.number(3);
  const factor = args.number(4, 2);

  if (cost < 0 || salvage < 0 || life <= 0 || period <= 0 || period > life || factor <= 0) {
    return raise('#NUM!');
  }

  const rate = Math.min(factor / life, 1);
  const before = rate === 1 ? cost * Number(period <= 1) : cost * (1 - rate) ** (period - 1);
  const after = cost * (1 - rate) ** period;

  return Math.max(0, after < salvage ? before - salvage : before - after);
};

const cumulative = (args: FunctionArgs, principal: boolean): number => {
  const first = Math.trunc(args.number(3));
  const last = Math.trunc(args.number(4));
  const type = Math.trunc(args.number(5));
  const annuity = { ...annuityArgs(args, CUMULATIVE_ORDER), due: type === 1 };
  const { rate, periods, present } = annuity;

  if (rate <= 0 || periods <= 0 || present <= 0 || first < 1 || last < first || last > periods) {
    return raise('#NUM!');
  }
  if (type !== 0 && type !== 1) {
    return raise('#NUM!');
  }

  const payment = paymentOf(annuity);
  let total = 0;

  for (let period = first; period <= last; period += 1) {
    const interest = interestOf(annuity, period);

    total += principal ? payment - interest : interest;
  }
  return total;
};

const positive = (...values: readonly number[]): boolean => values.every((value) => value > 0);

const finance = (
  name: string,
  max: number,
  compute: (args: FunctionArgs) => number,
  min = max,
): FunctionSpec =>
  defineFunction({
    name,
    min,
    max,
    lift: Array.from({ length: max }, (_, index) => index),
    evaluate: (args) => numberValue(finite(compute(args))),
  });

export const FINANCIAL_FUNCTIONS: readonly FunctionSpec[] = [
  finance('PMT', 5, (args) => paymentOf(annuityArgs(args, PAYMENT_ORDER)), 3),
  finance('FV', 5, (args) => futureOf(annuityArgs(args, FUTURE_ORDER)), 3),
  finance('PV', 5, (args) => presentOf(annuityArgs(args, PRESENT_ORDER)), 3),
  finance('NPER', 5, (args) => periodsOf(annuityArgs(args, PERIODS_ORDER)), 3),
  finance('RATE', 6, (args) => rateOf(annuityArgs(args, RATE_ORDER), args.number(5, 0.1)), 3),
  finance('IPMT', 6, (args) => interestOf(annuityArgs(args, PERIOD_ORDER), args.number(1)), 4),
  finance(
    'PPMT',
    6,
    (args) => {
      const annuity = annuityArgs(args, PERIOD_ORDER);

      return paymentOf(annuity) - interestOf(annuity, args.number(1));
    },
    4,
  ),
  defineFunction({
    name: 'NPV',
    min: 2,
    max: 255,
    lift: [0],
    evaluate: (args) => {
      const rate = args.number(0);
      const flows = numbersOf(args, 1);

      return rate === -1
        ? raise('#DIV/0!')
        : numberValue(finite(discounted(rate, flows, following(flows))));
    },
  }),
  defineFunction({
    name: 'XNPV',
    min: 3,
    max: 3,
    lift: [0],
    evaluate: (args) => {
      const rate = args.number(0);
      const { flows, times } = datedFlows(args, 1);

      return rate <= -1 ? raise('#NUM!') : numberValue(finite(discounted(rate, flows, times)));
    },
  }),
  defineFunction({
    name: 'IRR',
    min: 1,
    max: 2,
    lift: [1],
    evaluate: (args) => {
      const flows = numbersOf(args, 0, 1);

      return numberValue(returnOf(flows, [], args.number(1, 0.1)));
    },
  }),
  defineFunction({
    name: 'XIRR',
    min: 2,
    max: 3,
    lift: [2],
    evaluate: (args) => {
      const { flows, times } = datedFlows(args, 0);

      return numberValue(returnOf(flows, times, args.number(2, 0.1)));
    },
  }),
  defineFunction({
    name: 'MIRR',
    min: 3,
    max: 3,
    lift: [1, 2],
    evaluate: (args) =>
      numberValue(finite(modifiedReturn(numbersOf(args, 0, 1), args.number(1), args.number(2)))),
  }),
  finance('EFFECT', 2, (args) => {
    const nominal = args.number(0);
    const periods = Math.trunc(args.number(1));

    return nominal <= 0 || periods < 1 ? raise('#NUM!') : growth(nominal / periods, periods) - 1;
  }),
  finance('NOMINAL', 2, (args) => {
    const effective = args.number(0);
    const periods = Math.trunc(args.number(1));

    return effective <= 0 || periods < 1
      ? raise('#NUM!')
      : periods * (growth(effective, 1 / periods) - 1);
  }),
  finance('SLN', 3, (args) => {
    const life = args.number(2);

    return life === 0 ? raise('#DIV/0!') : (args.number(0) - args.number(1)) / life;
  }),
  finance('SYD', 4, (args) => {
    const life = args.number(2);
    const period = args.number(3);

    return life <= 0 || period <= 0 || period > life
      ? raise('#NUM!')
      : ((args.number(0) - args.number(1)) * (life - period + 1) * 2) / (life * (life + 1));
  }),
  finance('DB', 5, decliningArgs, 4),
  finance('DDB', 5, doubleDeclining, 4),
  finance('CUMIPMT', 6, (args) => cumulative(args, false)),
  finance('CUMPRINC', 6, (args) => cumulative(args, true)),
  finance('RRI', 3, (args) => {
    const periods = args.number(0);
    const present = args.number(1);

    return periods <= 0 || present === 0
      ? raise('#NUM!')
      : (args.number(2) / present) ** (1 / periods) - 1;
  }),
  finance('PDURATION', 3, (args) => {
    const rate = args.number(0);
    const present = args.number(1);
    const future = args.number(2);

    return positive(rate, present, future)
      ? (Math.log(future) - Math.log(present)) / Math.log(1 + rate)
      : raise('#NUM!');
  }),
];

export const scaled = (value: number, digits: number, round: (value: number) => number): number => {
  const factor = 10 ** Math.trunc(digits);

  return (Math.sign(value) * round(Number((Math.abs(value) * factor).toPrecision(15)))) / factor;
};

export const roundHalfAway = (value: number, digits: number): number =>
  scaled(value, digits, Math.round);

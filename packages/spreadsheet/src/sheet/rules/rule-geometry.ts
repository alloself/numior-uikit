const RULES = ':scope > .nui-spreadsheet-rules__rules > .nui-spreadsheet-rules__rule';

const isElement = (node: Element): node is HTMLElement => node instanceof HTMLElement;

export const ruleElements = (list: HTMLElement | null): HTMLElement[] =>
  list === null ? [] : Array.from(list.querySelectorAll(RULES)).filter(isElement);

export const ruleIndexAt = (list: HTMLElement | null, from: number, client: number): number => {
  const rules = ruleElements(list);

  const above = rules.reduce((count, rule, index) => {
    const box = rule.getBoundingClientRect();

    return index !== from && box.top + box.height / 2 < client ? count + 1 : count;
  }, 0);

  return Math.max(0, Math.min(rules.length - 1, above));
};

export const dropLineAt = (list: HTMLElement, from: number, to: number): number => {
  const box = ruleElements(list)[to]?.getBoundingClientRect();
  const top = list.getBoundingClientRect().top;

  if (box === undefined) {
    return 0;
  }
  return (to > from ? box.bottom : box.top) - top;
};

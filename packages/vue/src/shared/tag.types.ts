export const HtmlTag = { Anchor: 'a' } as const satisfies Record<
  string,
  keyof HTMLElementTagNameMap
>;

export const labelTarget = (html: string): string | undefined => {
  const [, id] = /<label[^>]* for="([^"]+)"/.exec(html) ?? [];
  return id;
};

export const popoverTarget = (html: string): string | undefined => {
  const [, id] = /popovertarget="([^"]+)"/.exec(html) ?? [];
  return id;
};

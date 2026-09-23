import { createSSRApp, type VNode } from 'vue';
import { renderToString } from 'vue/server-renderer';

export const renderMarkup = (render: () => VNode): Promise<string> => {
  return renderToString(createSSRApp({ render }));
};

export const labelTarget = (html: string): string | undefined => {
  const [, id] = /<label[^>]* for="([^"]+)"/.exec(html) ?? [];
  return id;
};

export const popoverTarget = (html: string): string | undefined => {
  const [, id] = /popovertarget="([^"]+)"/.exec(html) ?? [];
  return id;
};

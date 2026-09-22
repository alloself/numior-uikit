import { createSSRApp, type VNode } from 'vue';
import { renderToString } from 'vue/server-renderer';

export function renderMarkup(render: () => VNode): Promise<string> {
  return renderToString(createSSRApp({ render }));
}

export function labelTarget(html: string): string | undefined {
  const [, id] = /<label[^>]* for="([^"]+)"/.exec(html) ?? [];
  return id;
}

import type { Header } from 'vitepress';
import type { NuiTocItem } from '@numior/vue';

interface TocBranch {
  readonly id: string;
  readonly label: string;
  readonly children: NuiTocItem[];
}

export const tocItemsOf = (headers: readonly Header[]): NuiTocItem[] => {
  const items: TocBranch[] = [];

  for (const header of headers) {
    const item: TocBranch = { id: header.slug, label: header.title, children: [] };
    const parent = items.at(-1);

    if (header.level === 2) {
      items.push(item);
    } else if (header.level === 3 && parent !== undefined) {
      parent.children.push(item);
    }
  }
  return items;
};

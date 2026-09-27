import { computed, type ComputedRef } from 'vue';
import { useData, useRoute, withBase } from 'vitepress';
import type { DocsSidebarGroup, DocsSidebarItem, DocsTexts, DocsThemeConfig } from '../theme.types';

export interface LocaleLink {
  readonly key: string;
  readonly label: string;
  readonly link: string;
  readonly current: boolean;
}

export interface Pager {
  readonly previous: DocsSidebarItem | undefined;
  readonly next: DocsSidebarItem | undefined;
}

export interface Docs {
  readonly texts: ComputedRef<DocsTexts>;
  readonly localeBase: ComputedRef<string>;
  readonly locales: ComputedRef<readonly LocaleLink[]>;
  readonly sidebar: ComputedRef<readonly DocsSidebarGroup[]>;
  readonly sectionLinks: ComputedRef<readonly DocsSidebarItem[]>;
  readonly allLinks: ComputedRef<readonly DocsSidebarItem[]>;
  readonly pager: ComputedRef<Pager>;
  isCurrent(link: string): boolean;
  startsCurrent(link: string): boolean;
  sectionItems(prefix: string): readonly DocsSidebarItem[];
}

const normalizePath = (path: string): string => {
  const trimmed = path.replace(/\.html$/, '').replace(/\/index$/, '/');

  return trimmed.length > 1 ? trimmed.replace(/\/$/, '') : trimmed;
};

const sectionOf = (
  sections: Readonly<Record<string, readonly DocsSidebarGroup[]>>,
  matches: (prefix: string) => boolean,
): readonly DocsSidebarGroup[] => {
  const match = Object.entries(sections)
    .filter(([prefix]) => matches(prefix))
    .toSorted(([a], [b]) => b.length - a.length)[0];

  return match?.[1] ?? [];
};

const startsWith = (path: string, prefix: string): boolean =>
  path === prefix || path.startsWith(`${prefix}/`);

const pageTail = (relativePath: string, localeKey: string): string => {
  const withoutLocale =
    localeKey === 'root' ? relativePath : relativePath.replace(new RegExp(`^${localeKey}/`), '');

  return withoutLocale.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '');
};

export const useDocs = (): Docs => {
  const { site, theme, page, localeIndex } = useData<DocsThemeConfig>();
  const route = useRoute();

  const texts = computed(() => theme.value.texts);

  const localeBase = computed(() =>
    localeIndex.value === 'root' ? '/' : `/${localeIndex.value}/`,
  );

  const currentPath = computed(() => normalizePath(route.path));

  const isCurrent = (link: string): boolean => currentPath.value === normalizePath(withBase(link));

  const startsCurrent = (link: string): boolean =>
    startsWith(currentPath.value, normalizePath(withBase(link)));

  const locales = computed<readonly LocaleLink[]>(() => {
    const tail = pageTail(page.value.relativePath, localeIndex.value);

    return Object.entries(site.value.locales).map(([key, locale]) => ({
      key,
      label: locale.label,
      link: withBase(`${key === 'root' ? '/' : `/${key}/`}${tail}`),
      current: key === localeIndex.value,
    }));
  });

  const sidebar = computed<readonly DocsSidebarGroup[]>(() =>
    sectionOf(theme.value.sidebar, startsCurrent),
  );

  const sectionItems = (prefix: string): readonly DocsSidebarItem[] => {
    const path = normalizePath(withBase(prefix));

    return sectionOf(theme.value.sidebar, (candidate) =>
      startsWith(path, normalizePath(withBase(candidate))),
    ).flatMap((group) => group.items);
  };

  const sectionLinks = computed(() => sidebar.value.flatMap((group) => group.items));

  const allLinks = computed(() =>
    Object.values(theme.value.sidebar).flatMap((groups) => groups.flatMap((group) => group.items)),
  );

  const pager = computed<Pager>(() => {
    const links = sectionLinks.value;
    const index = links.findIndex((item) => isCurrent(item.link));

    return {
      previous: index > 0 ? links[index - 1] : undefined,
      next: index >= 0 ? links[index + 1] : undefined,
    };
  });

  return {
    texts,
    localeBase,
    locales,
    sidebar,
    sectionLinks,
    allLinks,
    pager,
    isCurrent,
    startsCurrent,
    sectionItems,
  };
};

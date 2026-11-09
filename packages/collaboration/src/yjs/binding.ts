import {
  DocIssueKind,
  ContentNodeKind,
  definePlugin,
  remoteChange,
  type DocIssue,
  type ElementNode,
} from '@numior/editor-core';
import { XmlElement, type Doc as YDoc, type XmlFragment } from 'yjs';
import { applyDocChange } from './doc-change';
import { documentOf, ID_ATTRIBUTE, readRoot, type ReadContext } from './from-yjs';
import { syncChildren } from './to-yjs';
import type { YjsBinding, YjsBindingOptions } from './yjs.types';

const NO_ROOT_ID = 'root';

const isRepairable = (issue: DocIssue): boolean =>
  issue.path.length > 0 &&
  (issue.kind === DocIssueKind.Content ||
    (issue.kind === DocIssueKind.Id && issue.reason === 'duplicate'));

const childById = (parent: XmlFragment, id: string): XmlElement | undefined =>
  parent
    .toArray()
    .findLast(
      (child): child is XmlElement =>
        child instanceof XmlElement && child.getAttribute(ID_ATTRIBUTE) === id,
    );

const elementAt = (
  fragment: XmlFragment,
  root: ElementNode,
  path: readonly number[],
): XmlElement | undefined => {
  let model: ElementNode = root;
  let parent: XmlFragment = fragment;
  let found: XmlElement | undefined;

  for (const index of path) {
    const child = model.content[index];

    if (child?.kind !== ContentNodeKind.Element) {
      return undefined;
    }

    found = childById(parent, child.id);

    if (found === undefined) {
      return undefined;
    }
    model = child;
    parent = found;
  }
  return found;
};

const removeChild = (element: XmlElement): void => {
  const parent = element.parent;

  if (parent instanceof XmlElement || isFragment(parent)) {
    parent.delete(parent.toArray().indexOf(element), 1);
  }
};

const isFragment = (value: unknown): value is XmlFragment =>
  typeof value === 'object' && value !== null && 'toArray' in value && 'insert' in value;

export const yjsBinding = (
  ydoc: YDoc,
  fragment: XmlFragment,
  options: YjsBindingOptions,
): YjsBinding => {
  const { schema, getState, dispatch, onInvalid } = options;
  const known = new WeakMap<XmlElement, ElementNode>();
  const context: ReadContext = { schema, known };
  const origin = Symbol('nui-yjs');
  let applying = false;

  const forget = (element: XmlElement): void => {
    let current: unknown = element;

    while (current instanceof XmlElement) {
      known.delete(current);
      current = current.parent;
    }
  };

  const repaired = (root: ElementNode): boolean => {
    const check = schema.check(root);

    if (check.ok || !check.issues.every(isRepairable)) {
      return false;
    }

    const targets = check.issues.map((issue) => elementAt(fragment, root, issue.path));

    ydoc.transact(() => {
      targets.forEach((target) => {
        if (target !== undefined) {
          forget(target);
          removeChild(target);
        }
      });
    }, origin);

    return targets.some((target) => target !== undefined);
  };

  const validRoot = (shell: ElementNode): ElementNode | undefined => {
    let root = readRoot(context, fragment, shell);

    while (root !== undefined && !schema.check(root).ok) {
      root = repaired(root) ? readRoot(context, fragment, shell) : undefined;
    }
    return root;
  };

  const pull = (): void => {
    const state = getState();

    if (state === undefined) {
      return;
    }

    const root = validRoot(state.doc.root);

    if (root === undefined) {
      onInvalid?.();
      return;
    }

    const tr = applyDocChange(state.tr, state.doc.root, root, (text, marks) =>
      schema.text(text, marks),
    ).setMeta(remoteChange, true);

    if (tr.changed) {
      applying = true;
      dispatch(tr);
      applying = false;
    }
  };

  const observer: Parameters<XmlFragment['observeDeep']>[0] = (events, transaction) => {
    if (transaction.origin === origin) {
      return;
    }

    events.forEach((event) => {
      if (event.target instanceof XmlElement) {
        forget(event.target);
      } else if (event.target.parent instanceof XmlElement) {
        forget(event.target.parent);
      }
    });

    pull();
  };

  const write = (root: ElementNode): void => {
    ydoc.transact(() => {
      syncChildren(known, fragment, root.content);
    }, origin);
  };

  fragment.observeDeep(observer);

  return {
    plugin: definePlugin({
      name: 'yjsBinding',
      props: {
        stateChanged: (state, before) => {
          if (state.doc !== before.doc && !applying) {
            write(state.doc.root);
          }
        },
      },
    }),
    read: () => {
      if (fragment.length === 0) {
        return undefined;
      }

      const root = validRoot(schema.element(schema.top.name, { id: NO_ROOT_ID }));

      return root === undefined ? undefined : documentOf(schema, root);
    },
    seed: (doc) => {
      write(doc.root);
    },
    destroy: () => {
      fragment.unobserveDeep(observer);
    },
  };
};

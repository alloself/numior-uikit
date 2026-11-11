const PAGES = new Set(['window', 'document', 'globalThis']);

const RELEASES = new Set(['onScopeDispose', 'tryOnScopeDispose', 'onBeforeUnmount', 'onUnmounted']);

const listensToPage = (callee) =>
  callee.type === 'MemberExpression' &&
  callee.object.type === 'Identifier' &&
  PAGES.has(callee.object.name) &&
  callee.property.type === 'Identifier' &&
  callee.property.name === 'addEventListener';

export const pageListeners = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      held: 'A listener on the page outlives its owner: end the gesture in onScopeDispose or listen through useEventListener.',
    },
  },
  create: (context) => {
    const added = [];
    const state = { released: false };

    return {
      CallExpression: (node) => {
        if (node.callee.type === 'Identifier' && RELEASES.has(node.callee.name)) {
          state.released = true;
          return;
        }

        if (!listensToPage(node.callee)) {
          return;
        }

        added.push(node);
      },
      'Program:exit': () => {
        if (state.released) {
          return;
        }

        added.forEach((node) => {
          context.report({ node, messageId: 'held' });
        });
      },
    };
  },
};

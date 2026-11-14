const COSTLY = /^(?:pointer|touch|wheel)/u;

const isCostlyType = (node) =>
  node !== undefined &&
  ((node.type === 'Literal' && typeof node.value === 'string' && COSTLY.test(node.value)) ||
    (node.type === 'ArrayExpression' &&
      node.elements.some((element) => isCostlyType(element ?? undefined))));

const addsListener = (callee) =>
  callee.type === 'MemberExpression' &&
  callee.property.type === 'Identifier' &&
  callee.property.name === 'addEventListener';

const togglesTarget = (callee, target) =>
  callee.type === 'Identifier' &&
  callee.name === 'useEventListener' &&
  target !== undefined &&
  target.type === 'ArrowFunctionExpression' &&
  target.body.type === 'ConditionalExpression';

export const pointerListeners = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      added:
        'Adding a pointer, touch or wheel listener restyles the whole page in WebKit: begin a usePointerSession or listen once at mount with useEventListener.',
      toggled:
        'A pointer, touch or wheel listener switched on and off by state restyles the whole page in WebKit each time: keep one session from usePointerSession and check the state in the handler.',
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      const [first, second] = node.arguments;

      if (addsListener(node.callee) && isCostlyType(first)) {
        context.report({ node, messageId: 'added' });
        return;
      }

      if (!togglesTarget(node.callee, first) || !isCostlyType(second)) {
        return;
      }

      context.report({ node, messageId: 'toggled' });
    },
  }),
};

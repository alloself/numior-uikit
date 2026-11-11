const METHODS = new Map([
  ['push', 'push the entries in a for…of loop'],
  ['unshift', 'build the list with an array literal'],
  ['splice', 'build the list with an array literal'],
]);

const STATICS = new Map([
  ['Math.min', 'use min or minBy of lodash-es'],
  ['Math.max', 'use max or maxBy of lodash-es'],
  ['String.fromCharCode', 'decode a bounded subarray per call'],
  ['String.fromCodePoint', 'decode a bounded slice per call'],
]);

const CHUNKS = new Set(['subarray', 'slice']);

const nameOf = (node) => (node.type === 'Identifier' ? node.name : undefined);

const isChunk = (node) =>
  node.type === 'CallExpression' &&
  node.callee.type === 'MemberExpression' &&
  CHUNKS.has(nameOf(node.callee.property)) &&
  node.arguments.length === 2;

const targetOf = (callee) => {
  if (callee.type !== 'MemberExpression' || callee.computed) {
    return undefined;
  }
  const method = nameOf(callee.property);
  const owned = `${nameOf(callee.object)}.${method}`;

  if (STATICS.has(owned)) {
    return { name: owned, hint: STATICS.get(owned) };
  }
  return METHODS.has(method) ? { name: method, hint: METHODS.get(method) } : undefined;
};

export const spreadArguments = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      spread:
        'A list spread into {{ name }}() lands on the call stack and throws once it is long: {{ hint }}.',
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      const target = targetOf(node.callee);

      if (target === undefined) {
        return;
      }

      node.arguments.forEach((argument) => {
        if (argument.type !== 'SpreadElement' || isChunk(argument.argument)) {
          return;
        }

        context.report({ node: argument, messageId: 'spread', data: target });
      });
    },
  }),
};

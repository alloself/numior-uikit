const COUNTER = /(revision|version|arrangement|stamp)$/iu;

const SIDES = new Set(['<', '<=', '>', '>=']);

const PASSED = new Set(['CallExpression', 'AwaitExpression', 'NewExpression']);

const nameOf = (node) => {
  switch (node.type) {
    case 'Identifier':
      return node.name;
    case 'MemberExpression':
      return node.property.type === 'Identifier' && node.property.name === 'value'
        ? nameOf(node.object)
        : nameOf(node.property);
    case 'CallExpression':
      return nameOf(node.callee);
    default:
      return undefined;
  }
};

const isCounter = (node) => COUNTER.test(nameOf(node) ?? '');

const isZero = (node) => node.type === 'Literal' && node.value === 0;

const touches = (node) => !PASSED.has(node.type) || isCounter(node);

export const versionReads = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      touched:
        'A bare read touches a version by hand: read the core through version.read(() => …).',
      compared:
        'A counter compared with zero touches a version by hand: read the core through version.read(() => …).',
    },
  },
  create: (context) => ({
    ExpressionStatement: (node) => {
      const { expression } = node;

      if (expression.type !== 'UnaryExpression' || expression.operator !== 'void') {
        return;
      }
      if (!touches(expression.argument)) {
        return;
      }

      context.report({ node, messageId: 'touched' });
    },
    BinaryExpression: (node) => {
      const counted =
        (isZero(node.right) && isCounter(node.left)) ||
        (isZero(node.left) && isCounter(node.right));

      if (!SIDES.has(node.operator) || !counted) {
        return;
      }

      context.report({ node, messageId: 'compared' });
    },
  }),
};

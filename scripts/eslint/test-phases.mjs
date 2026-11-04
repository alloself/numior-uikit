const TEST_ROOTS = new Set([
  'test',
  'it',
  'bench',
  'beforeEach',
  'afterEach',
  'beforeAll',
  'afterAll',
]);

const BLOCKS = new Set([
  'IfStatement',
  'ForStatement',
  'ForOfStatement',
  'ForInStatement',
  'WhileStatement',
  'DoWhileStatement',
  'SwitchStatement',
  'TryStatement',
  'BlockStatement',
]);

const EXITS = new Set(['ReturnStatement', 'ThrowStatement', 'BreakStatement', 'ContinueStatement']);

const rootOf = (node) => {
  let current = node;

  while (current.type === 'CallExpression' || current.type === 'MemberExpression') {
    current = current.type === 'CallExpression' ? current.callee : current.object;
  }
  return current;
};

const isDescribe = (callee) =>
  (callee.type === 'Identifier' && callee.name === 'describe') ||
  (callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'describe');

const isTestCall = (node) => {
  const root = rootOf(node.callee);

  return root.type === 'Identifier' && TEST_ROOTS.has(root.name) && !isDescribe(node.callee);
};

const kindOf = (statement) => {
  if (statement.type !== 'ExpressionStatement') {
    return 'act';
  }

  const expression =
    statement.expression.type === 'AwaitExpression'
      ? statement.expression.argument
      : statement.expression;

  const root = rootOf(expression);

  return root.type === 'Identifier' && root.name.startsWith('expect') ? 'assert' : 'act';
};

const needsBlank = (previous, next) =>
  !EXITS.has(next.type) &&
  (BLOCKS.has(previous.type) ||
    BLOCKS.has(next.type) ||
    (kindOf(previous) === 'assert' && kindOf(next) === 'act'));

const nestedBlocks = (statement) => {
  switch (statement.type) {
    case 'IfStatement':
      return [statement.consequent, statement.alternate].flatMap((part) =>
        part === null ? [] : part.type === 'IfStatement' ? nestedBlocks(part) : [part],
      );
    case 'ForStatement':
    case 'ForOfStatement':
    case 'ForInStatement':
    case 'WhileStatement':
    case 'DoWhileStatement':
      return [statement.body];
    case 'TryStatement':
      return [statement.block, statement.handler?.body, statement.finalizer].filter(Boolean);
    case 'BlockStatement':
      return [statement];
    default:
      return [];
  }
};

export const testPhases = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    schema: [],
    messages: {
      phase: 'Separate test phases with a blank line: after a run of assertions and around blocks.',
    },
  },
  create: (context) => {
    const checkBlock = (block) => {
      if (block.type !== 'BlockStatement') {
        return;
      }

      block.body.forEach((statement, index) => {
        const previous = block.body[index - 1];

        if (
          previous !== undefined &&
          needsBlank(previous, statement) &&
          statement.loc.start.line - previous.loc.end.line < 2
        ) {
          context.report({
            node: statement,
            messageId: 'phase',
            fix: (fixer) => fixer.insertTextAfter(previous, '\n'),
          });
        }
        nestedBlocks(statement).forEach(checkBlock);
      });
    };

    return {
      CallExpression: (node) => {
        if (!isTestCall(node)) {
          return;
        }

        node.arguments.forEach((argument) => {
          if (
            argument.type === 'ArrowFunctionExpression' ||
            argument.type === 'FunctionExpression'
          ) {
            checkBlock(argument.body);
          }
        });
      },
    };
  },
};

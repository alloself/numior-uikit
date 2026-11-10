const FUNCTIONS = new Set(['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration']);

const EQUALITY = new Map([
  ['===', '!=='],
  ['!==', '==='],
  ['==', '!='],
  ['!=', '=='],
]);

const ORDER = new Map([
  ['<', '>='],
  ['>=', '<'],
  ['>', '<='],
  ['<=', '>'],
]);

const PLAIN = new Set([
  'Identifier',
  'MemberExpression',
  'CallExpression',
  'ChainExpression',
  'ThisExpression',
]);

const OPPOSITE = new Map([
  ['&&', '||'],
  ['||', '&&'],
]);

const COUNTS = new Set(['length', 'size']);

const MIN_STATEMENTS = 2;

const returnsValue = (node) => {
  if (node === null || typeof node !== 'object' || FUNCTIONS.has(node.type)) {
    return false;
  }

  if (node.type === 'ReturnStatement') {
    return node.argument !== null;
  }

  return Object.entries(node).some(
    ([key, value]) =>
      key !== 'parent' && (Array.isArray(value) ? value.some(returnsValue) : returnsValue(value)),
  );
};

const declaredIn = (block) =>
  block.body.flatMap((statement) => {
    if (statement.type === 'VariableDeclaration') {
      return statement.declarations;
    }
    return statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration'
      ? [statement]
      : [];
  });

const holdsItems = (node) =>
  node.type === 'BinaryExpression' &&
  node.operator === '>' &&
  node.right.type === 'Literal' &&
  node.right.value === 0 &&
  node.left.type === 'MemberExpression' &&
  node.left.property.type === 'Identifier' &&
  COUNTS.has(node.left.property.name);

const negated = (node, source) => {
  const text = source.getText(node);

  if (node.type === 'UnaryExpression' && node.operator === '!') {
    return { text: source.getText(node.argument), joins: undefined };
  }

  if (node.type === 'BinaryExpression' && EQUALITY.has(node.operator)) {
    return {
      text: `${source.getText(node.left)} ${EQUALITY.get(node.operator)} ${source.getText(node.right)}`,
      joins: undefined,
    };
  }

  if (holdsItems(node)) {
    return { text: `${source.getText(node.left)} === 0`, joins: undefined };
  }

  if (node.type === 'BinaryExpression' && ORDER.has(node.operator)) {
    return {
      text: `${source.getText(node.left)} ${ORDER.get(node.operator)} ${source.getText(node.right)}`,
      joins: undefined,
    };
  }

  if (node.type === 'LogicalExpression' && OPPOSITE.has(node.operator)) {
    const joins = OPPOSITE.get(node.operator);

    const parts = [node.left, node.right].map((side) => {
      const part = negated(side, source);

      return part.joins !== undefined && part.joins !== joins ? `(${part.text})` : part.text;
    });

    return { text: parts.join(` ${joins} `), joins };
  }

  return { text: PLAIN.has(node.type) ? `!${text}` : `!(${text})`, joins: undefined };
};

export const guardFirst = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      guard:
        'Leave early: return when the condition does not hold instead of wrapping the rest of the function in an if.',
    },
  },
  create: (context) => {
    const source = context.sourceCode;

    const clashes = (block, owner) => {
      const taken = new Set(source.getDeclaredVariables(owner).map((variable) => variable.name));

      owner.body.body.forEach((statement) => {
        source.getDeclaredVariables(statement).forEach((variable) => {
          taken.add(variable.name);
        });
      });

      return declaredIn(block).some((declaration) =>
        source.getDeclaredVariables(declaration).some((variable) => taken.has(variable.name)),
      );
    };

    const check = (owner) => {
      if (owner.body.type !== 'BlockStatement') {
        return;
      }

      const last = owner.body.body.at(-1);

      if (
        last === undefined ||
        last.type !== 'IfStatement' ||
        last.alternate !== null ||
        last.consequent.type !== 'BlockStatement' ||
        last.consequent.body.length < MIN_STATEMENTS ||
        returnsValue(last.consequent) ||
        owner.body.body.slice(0, -1).some(returnsValue)
      ) {
        return;
      }

      const first = last.consequent.body[0];
      const final = last.consequent.body.at(-1);

      context.report({
        node: last,
        messageId: 'guard',
        fix: clashes(last.consequent, owner)
          ? undefined
          : (fixer) =>
              fixer.replaceText(
                last,
                `if (${negated(last.test, source).text}) {\nreturn;\n}\n\n${source.text.slice(first.range[0], final.range[1])}`,
              ),
      });
    };

    return {
      ArrowFunctionExpression: check,
      FunctionExpression: check,
      FunctionDeclaration: check,
    };
  },
};

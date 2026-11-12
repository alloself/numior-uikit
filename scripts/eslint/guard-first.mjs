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

const EXITS = new Set(['ReturnStatement', 'ThrowStatement', 'BreakStatement', 'ContinueStatement']);

const FALLBACKS = new Set(['Literal', 'Identifier', 'TemplateLiteral']);

const MIN_VALUE_STATEMENTS = 2;

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

const OTHER = 'other';

const sidesOf = (node, source) => {
  const operator = source.getTokenAfter(node.left, {
    filter: (token) => token.value === node.operator,
  });

  return [
    source.text.slice(node.range[0], operator.range[0]).trimEnd(),
    source.text.slice(operator.range[1], node.range[1]).trimStart(),
  ];
};

const joinsOf = (node) => {
  if (node.type === 'LogicalExpression') {
    return OPPOSITE.has(node.operator) ? node.operator : OTHER;
  }

  return PLAIN.has(node.type) || node.type === 'Literal' || node.type === 'UnaryExpression'
    ? undefined
    : OTHER;
};

const negated = (node, source) => {
  if (node.type === 'UnaryExpression' && node.operator === '!') {
    return { text: source.getText(node.argument), joins: joinsOf(node.argument) };
  }

  if (node.type === 'BinaryExpression' && EQUALITY.has(node.operator)) {
    const [left, right] = sidesOf(node, source);

    return { text: `${left} ${EQUALITY.get(node.operator)} ${right}`, joins: undefined };
  }

  if (holdsItems(node)) {
    return { text: `${source.getText(node.left)} === 0`, joins: undefined };
  }

  if (node.type === 'BinaryExpression' && ORDER.has(node.operator)) {
    const [left, right] = sidesOf(node, source);

    return { text: `${left} ${ORDER.get(node.operator)} ${right}`, joins: undefined };
  }

  if (node.type === 'LogicalExpression' && OPPOSITE.has(node.operator)) {
    const joins = OPPOSITE.get(node.operator);

    const parts = [node.left, node.right].map((side) => {
      const part = negated(side, source);

      return part.joins !== undefined && part.joins !== joins ? `(${part.text})` : part.text;
    });

    return { text: parts.join(` ${joins} `), joins };
  }

  const text = source.getText(node);

  return { text: PLAIN.has(node.type) ? `!${text}` : `!(${text})`, joins: undefined };
};

const isTail = (node) =>
  node !== undefined &&
  node.type === 'IfStatement' &&
  node.alternate === null &&
  node.consequent.type === 'BlockStatement' &&
  node.consequent.body.length > 0;

const isFallback = (node) =>
  node === null ||
  FALLBACKS.has(node.type) ||
  (node.type === 'ArrayExpression' && node.elements.length === 0) ||
  (node.type === 'ObjectExpression' && node.properties.length === 0) ||
  (node.type === 'UnaryExpression' && node.argument.type === 'Literal');

const leaves = (statement, exit) =>
  statement.type === exit && (statement.argument ?? null) === null && !statement.label;

export const guardFirst = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      guard:
        'Leave early: return when the condition does not hold instead of wrapping the rest of the function in an if.',
      skip: 'Leave early: continue when the condition does not hold instead of wrapping the rest of the loop body in an if.',
    },
  },
  create: (context) => {
    const source = context.sourceCode;

    const clashes = (block, scopes) => {
      const taken = new Set(
        scopes.flatMap((scope) =>
          source.getDeclaredVariables(scope).map((variable) => variable.name),
        ),
      );

      return declaredIn(block).some((declaration) =>
        source.getDeclaredVariables(declaration).some((variable) => taken.has(variable.name)),
      );
    };

    const unwrapped = (tail, exit, guard) => {
      const body = tail.consequent.body;
      const kept = leaves(body.at(-1), exit) ? body.slice(0, -1) : body;
      const first = kept[0];
      const final = kept.at(-1);
      const rest = first === undefined ? '' : source.text.slice(first.range[0], final.range[1]);

      return `if (${negated(tail.test, source).text}) {\n${guard}\n}\n\n${rest}`;
    };

    const report = (tail, messageId, scopes, fix) => {
      context.report({
        node: tail,
        messageId,
        fix: clashes(tail.consequent, scopes) ? undefined : fix,
      });
    };

    const checkVoid = (owner, tail) => {
      const body = owner.body.body;
      const final = tail.consequent.body.at(-1);

      if (
        final.type === 'ThrowStatement' ||
        (tail.consequent.body.length === 1 && final.type === 'ReturnStatement') ||
        returnsValue(tail.consequent) ||
        body.slice(0, -1).some(returnsValue)
      ) {
        return;
      }

      report(tail, 'guard', [owner, ...body.slice(0, -1)], (fixer) =>
        fixer.replaceText(tail, unwrapped(tail, 'ReturnStatement', 'return;')),
      );
    };

    const checkValue = (owner, tail, fallback) => {
      const body = owner.body.body;
      const inner = tail.consequent.body;
      const final = inner.at(-1);

      if (
        inner.length < MIN_VALUE_STATEMENTS ||
        (final.type !== 'ReturnStatement' && final.type !== 'ThrowStatement') ||
        !isFallback(fallback.argument)
      ) {
        return;
      }

      report(tail, 'guard', [owner, ...body.slice(0, -2)], (fixer) => [
        fixer.replaceText(tail, unwrapped(tail, '', source.getText(fallback))),
        fixer.remove(fallback),
      ]);
    };

    const check = (owner) => {
      if (owner.body.type !== 'BlockStatement') {
        return;
      }

      const last = owner.body.body.at(-1);
      const before = owner.body.body.at(-2);

      if (isTail(last)) {
        checkVoid(owner, last);
        return;
      }

      if (last?.type !== 'ReturnStatement' || !isTail(before)) {
        return;
      }

      checkValue(owner, before, last);
    };

    const checkLoop = (loop) => {
      if (loop.body.type !== 'BlockStatement') {
        return;
      }

      const body = loop.body.body;
      const tail = body.at(-1);

      if (!isTail(tail)) {
        return;
      }

      const inner = tail.consequent.body;
      const final = inner.at(-1);
      const exits = EXITS.has(final.type) && !leaves(final, 'ContinueStatement');

      if (exits || (inner.length === 1 && final.type === 'ContinueStatement')) {
        return;
      }

      const heads = [loop.init, loop.left].filter(
        (part) => part !== undefined && part !== null && part.type === 'VariableDeclaration',
      );

      report(tail, 'skip', [...heads, ...body.slice(0, -1)], (fixer) =>
        fixer.replaceText(tail, unwrapped(tail, 'ContinueStatement', 'continue;')),
      );
    };

    return {
      ArrowFunctionExpression: check,
      FunctionExpression: check,
      FunctionDeclaration: check,
      ForStatement: checkLoop,
      ForOfStatement: checkLoop,
      ForInStatement: checkLoop,
      WhileStatement: checkLoop,
      DoWhileStatement: checkLoop,
    };
  },
};

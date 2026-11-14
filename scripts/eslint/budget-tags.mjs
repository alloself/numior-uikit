const TESTS = new Set(['it', 'test']);

const SUITES = new Set(['describe', 'suite']);

const BUDGET_NAME = /(?:^|_)BUDGET(?:_|$)/;

const TAG = 'budget';

const calleeName = (callee) => {
  if (callee.type === 'Identifier') {
    return callee.name;
  }

  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
    return callee.object.name;
  }

  return undefined;
};

const isTagValue = (value) => value.type === 'Literal' && value.value === TAG;

const tagged = (call) => {
  const options = call.arguments[1];

  if (options?.type !== 'ObjectExpression') {
    return false;
  }

  return options.properties.some((property) => {
    const named =
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      property.key.name === 'tags';

    if (!named) {
      return false;
    }

    if (property.value.type === 'ArrayExpression') {
      return property.value.elements.some((element) => element !== null && isTagValue(element));
    }

    return isTagValue(property.value);
  });
};

const readsClock = (node) =>
  node.callee.type === 'MemberExpression' &&
  node.callee.object.type === 'Identifier' &&
  node.callee.object.name === 'performance' &&
  node.callee.property.type === 'Identifier' &&
  node.callee.property.name === 'now';

const declares = (node) =>
  (node.parent.type === 'VariableDeclarator' && node.parent.id === node) ||
  (node.parent.type === 'Property' && node.parent.key === node && !node.parent.computed);

const BOUNDS = new Set(['toBeLessThan', 'toBeLessThanOrEqual']);

const bounds = (node) =>
  node.callee.type === 'MemberExpression' &&
  node.callee.property.type === 'Identifier' &&
  BOUNDS.has(node.callee.property.name);

const isTest = (call) => TESTS.has(calleeName(call.callee) ?? '');

const isSuite = (call) => SUITES.has(calleeName(call.callee) ?? '');

export const budgetTags = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      untagged:
        'A test that holds a time budget carries the budget tag: it("…", { tags: ["budget"] }, …). Coverage leaves such tests out and `test:budget` runs them uninstrumented.',
    },
  },
  create: (context) => {
    const tests = new Map();

    const noteOf = (node) => {
      const calls = context.sourceCode
        .getAncestors(node)
        .filter((ancestor) => ancestor.type === 'CallExpression');

      const test = calls.findLast(isTest);

      if (test === undefined) {
        return undefined;
      }

      const known = tests.get(test);

      if (known !== undefined) {
        return known;
      }

      const note = {
        covered: calls.some((call) => (isTest(call) || isSuite(call)) && tagged(call)),
        named: false,
        clock: false,
        bound: false,
      };

      tests.set(test, note);
      return note;
    };

    const mark = (node, key) => {
      const note = noteOf(node);

      if (note === undefined) {
        return;
      }

      note[key] = true;
    };

    return {
      Identifier: (node) => {
        if (!BUDGET_NAME.test(node.name) || declares(node)) {
          return;
        }

        mark(node, 'named');
      },
      CallExpression: (node) => {
        if (readsClock(node)) {
          mark(node, 'clock');
          return;
        }

        if (!bounds(node)) {
          return;
        }

        mark(node, 'bound');
      },
      'Program:exit': () => {
        tests.forEach((note, test) => {
          const timed = note.named || (note.clock && note.bound);

          if (note.covered || !timed) {
            return;
          }

          context.report({ node: test.callee, messageId: 'untagged' });
        });
      },
    };
  },
};

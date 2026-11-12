const PROPS = new Map([
  ['bordered', 'variant "outline" for a frame, gridlines for lines between cells'],
  ['dismissible', 'closable'],
  ['closeable', 'closable'],
  ['dismissLabel', 'closeLabel'],
  ['removeable', 'removable'],
  ['isOpen', 'open'],
  ['visible', 'open'],
  ['opened', 'open'],
  ['color', 'tone'],
  ['colour', 'tone'],
  ['intent', 'tone'],
  ['severity', 'tone'],
  ['appearance', 'variant'],
  ['readOnly', 'readonly'],
  ['isDisabled', 'disabled'],
  ['isLoading', 'loading'],
  ['pending', 'loading'],
  ['busy', 'loading'],
  ['cyclic', 'loop'],
  ['circular', 'loop'],
  ['sideOffset', 'offset'],
  ['distance', 'offset'],
  ['lang', 'locale'],
]);

const EVENTS = new Map([
  ['dismiss', 'close'],
  ['hide', 'close'],
  ['closed', 'close'],
  ['delete', 'remove'],
  ['removed', 'remove'],
  ['choose', 'select'],
  ['chosen', 'select'],
]);

const MODELS = new Map([
  ['value', 'the default model'],
  ['modelValues', 'values'],
  ['selectedValues', 'values'],
  ['isOpen', 'open'],
  ['visible', 'open'],
  ['opened', 'open'],
]);

const OWNERS = /(Props|Options)$/;

const EMITTERS = /(Events|Emits)$/;

const nameOf = (key) => {
  if (key.type === 'Identifier') {
    return key.name;
  }
  return key.type === 'Literal' && typeof key.value === 'string' ? key.value : undefined;
};

const isCallback = (member) => member.typeAnnotation?.typeAnnotation.type === 'TSFunctionType';

const wordsOf = (owner) => {
  if (OWNERS.test(owner)) {
    return { names: PROPS, messageId: 'prop' };
  }
  return EMITTERS.test(owner) ? { names: EVENTS, messageId: 'event' } : undefined;
};

const membersOf = (type) => (type?.type === 'TSTypeLiteral' ? type.members : []);

const isCallTo = (node, name) => node.callee.type === 'Identifier' && node.callee.name === name;

export const apiNames = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      prop: 'The kit names this prop differently: use {{ wanted }} instead of "{{ name }}".',
      event: 'The kit names this event "{{ wanted }}", not "{{ name }}".',
      model: 'The kit names this model differently: use {{ wanted }} instead of "{{ name }}".',
    },
  },
  create: (context) => {
    const check = (node, name, words, messageId) => {
      const wanted = name === undefined ? undefined : words.get(name);

      if (wanted === undefined) {
        return;
      }

      context.report({ node, messageId, data: { name, wanted } });
    };

    return {
      TSInterfaceDeclaration: (node) => {
        const words = wordsOf(node.id.name);

        if (words === undefined) {
          return;
        }

        node.body.body.forEach((member) => {
          if (member.type !== 'TSPropertySignature' || isCallback(member)) {
            return;
          }

          check(member.key, nameOf(member.key), words.names, words.messageId);
        });
      },
      CallExpression: (node) => {
        const [type] = node.typeArguments?.params ?? [];

        if (isCallTo(node, 'defineEmits')) {
          membersOf(type).forEach((member) => {
            if (member.type !== 'TSPropertySignature') {
              return;
            }

            check(member.key, nameOf(member.key), EVENTS, 'event');
          });

          return;
        }

        const [first] = node.arguments;

        if (!isCallTo(node, 'defineModel') || first?.type !== 'Literal') {
          return;
        }

        check(first, nameOf(first), MODELS, 'model');
      },
    };
  },
};

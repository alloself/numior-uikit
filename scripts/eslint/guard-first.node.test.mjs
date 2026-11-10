import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vite-plus/test';
import { guardFirst } from './guard-first.mjs';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { parser: tsParser } });

const error = { messageId: 'guard' };

tester.run('guard-first', guardFirst, {
  valid: [
    `const onClick = (event) => {
  if (!blocked) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
};`,
    `const open = () => {
  if (ready) {
    show();
  }
};`,
    `const pick = (items) => {
  if (items.length > 0) {
    note(items);
    return items[0];
  }
};`,
    `const toggle = () => {
  if (open) {
    close();
    blur();
  } else {
    show();
  }
};`,
    `const each = (items) => {
  for (const item of items) {
    if (item.ready) {
      show(item);
      count(item);
    }
  }
};`,
  ],
  invalid: [
    {
      code: `const onClick = (event) => {
  if (loading || (disabled && isLink.value)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
};`,
      output: `const onClick = (event) => {
  if (!loading && (!disabled || !isLink.value)) {
return;
}

event.preventDefault();
    event.stopImmediatePropagation();
};`,
      errors: [error],
    },
    {
      code: `const place = () => {
  const box = measure();
  if (box !== undefined && !hidden) {
    move(box);
    show();
  }
};`,
      output: `const place = () => {
  const box = measure();
  if (box === undefined || hidden) {
return;
}

move(box);
    show();
};`,
      errors: [error],
    },
    {
      code: `function step(index) {
  if (index < count && list?.contains(node) === true) {
    advance();
    draw();
  }
}`,
      output: `function step(index) {
  if (index >= count || list?.contains(node) !== true) {
return;
}

advance();
    draw();
}`,
      errors: [error],
    },
    {
      code: `const follow = (event) => {
  if (event instanceof MouseEvent || (a && b) || ready()) {
    track(event);
    draw();
  }
};`,
      output: `const follow = (event) => {
  if (!(event instanceof MouseEvent) && (!a || !b) && !ready()) {
return;
}

track(event);
    draw();
};`,
      errors: [error],
    },
    {
      code: `const flush = () => {
  if (queue.length > 0 && budget > 0) {
    send(queue);
    clear();
  }
};`,
      output: `const flush = () => {
  if (queue.length === 0 || budget <= 0) {
return;
}

send(queue);
    clear();
};`,
      errors: [error],
    },
    {
      code: `const rename = (name) => {
  if (name !== current) {
    const event = build(name);
    send(event);
  }
};
const handle = (event) => {
  if (event.ok) {
    const event = again();
    send(event);
  }
};`,
      output: `const rename = (name) => {
  if (name === current) {
return;
}

const event = build(name);
    send(event);
};
const handle = (event) => {
  if (event.ok) {
    const event = again();
    send(event);
  }
};`,
      errors: [error, error],
    },
  ],
});

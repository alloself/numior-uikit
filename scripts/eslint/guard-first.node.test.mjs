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

const skip = { messageId: 'skip' };

tester.run('guard-first', guardFirst, {
  valid: [
    `const onClick = (event) => {
  if (!blocked) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
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
    `const check = (value) => {
  prepare(value);
  if (value === undefined) {
    throw new Error('empty');
  }
};`,
    `const find = (items) => {
  for (const item of items) {
    mark(item);
    if (item.ready) {
      show(item);
      break;
    }
  }
};`,
    `const read = (key) => {
  if (cache.has(key)) {
    touch(key);
    return cache.get(key);
  }
  return compute(key);
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
    {
      code: `const open = () => {
  if (ready) {
    show();
  }
};`,
      output: `const open = () => {
  if (!ready) {
return;
}

show();
};`,
      errors: [error],
    },
    {
      code: `const close = () => {
  if (shown) {
    hide();
    return;
  }
};`,
      output: `const close = () => {
  if (!shown) {
return;
}

hide();
};`,
      errors: [error],
    },
    {
      code: `const each = (items) => {
  for (const item of items) {
    if (item.ready) {
      show(item);
    }
  }
};`,
      output: `const each = (items) => {
  for (const item of items) {
    if (!item.ready) {
continue;
}

show(item);
  }
};`,
      errors: [skip],
    },
    {
      code: `const drain = () => {
  while (queue.length > 0) {
    const item = queue.pop();
    if (item !== undefined && item.live) {
      send(item);
      count += 1;
    }
  }
};`,
      output: `const drain = () => {
  while (queue.length > 0) {
    const item = queue.pop();
    if (item === undefined || !item.live) {
continue;
}

send(item);
      count += 1;
  }
};`,
      errors: [skip],
    },
    {
      code: `const first = (items) => {
  if (items.length > 0) {
    note(items);
    return items[0];
  }
  return undefined;
};`,
      output:
        `const first = (items) => {
  if (items.length === 0) {
return undefined;
}

note(items);
    return items[0];
` +
        '  ' +
        `
};`,
      errors: [error],
    },
    {
      code: `const fit = (size) => {
  if ((size ?? 0) > limit && (wide ? left : right) !== edge) {
    shrink();
  }
};`,
      output: `const fit = (size) => {
  if ((size ?? 0) <= limit || (wide ? left : right) === edge) {
return;
}

shrink();
};`,
      errors: [error],
    },
    {
      code: `const wake = () => {
  if (!(quiet ? idle : busy) && armed) {
    ring();
  }
};`,
      output: `const wake = () => {
  if ((quiet ? idle : busy) || !armed) {
return;
}

ring();
};`,
      errors: [error],
    },
    {
      code: `const scan = (rows) => {
  for (const row of rows) {
    const cell = row.first;
    if (cell.live) {
      const cell = row.last;
      send(cell);
    }
  }
};`,
      output: null,
      errors: [skip],
    },
  ],
});

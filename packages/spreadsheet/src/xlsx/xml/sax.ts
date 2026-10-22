import type {
  XmlAttribute,
  XmlFailure,
  XmlFailureReason,
  XmlHandlers,
  XmlName,
  XmlParser,
} from './xml.types';

interface Scope {
  readonly prefixes: ReadonlyMap<string, string>;
  readonly elements: Map<string, XmlName>;
  readonly attributes: Map<string, XmlName>;
}

interface Open {
  readonly name: XmlName;
  readonly scope: Scope;
}

export interface XmlStreamOptions {
  readonly signal?: AbortSignal | undefined;
  readonly budgetMs?: number | undefined;
  readonly yieldTo?: (() => Promise<void>) | undefined;
  readonly onBytes?: ((bytes: number) => void) | undefined;
}

export const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';

const ROOT: Scope = {
  prefixes: new Map([['xml', XML_NAMESPACE]]),
  elements: new Map(),
  attributes: new Map(),
};

const ATTRIBUTE = /\s*([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/uy;

const NAME_END = /[\s/>]/gu;

const TAG_SPECIAL = /["'>]/gu;

const TRAILING = /\s*\/?>/uy;

const ENTITY = /&(#x[\dA-Fa-f]+|#\d+|lt|gt|amp|quot|apos);/gu;

const NEEDS_DECODING = /[&\r]/u;

const ATTRIBUTE_NEEDS = /[&\t\n\r]/u;

const LINE_BREAK = /\r\n?/gu;

const ATTRIBUTE_SPACE = /[\t\n\r]/gu;

const PIECE = 32_768;

const SLASH = 47;

const BANG = 33;

const QUESTION = 63;

const NAMED: Readonly<Record<string, string>> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
};

class XmlSyntaxError extends Error {
  readonly failure: XmlFailure;

  constructor(reason: XmlFailureReason, position: number) {
    super(`xml: ${reason} at ${String(position)}`);
    this.failure = { reason, position };
  }
}

const entityText = (entity: string): string => {
  if (!entity.startsWith('#')) {
    return NAMED[entity] ?? '';
  }

  const code =
    entity[1] === 'x' ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);

  return code <= 0x10_ff_ff ? String.fromCodePoint(code) : '�';
};

const entities = (text: string, position: number): string => {
  if (!text.includes('&')) {
    return text;
  }
  if (text.replaceAll(ENTITY, '').includes('&')) {
    throw new XmlSyntaxError('entity', position);
  }
  return text.replaceAll(ENTITY, (_match, entity: string) => entityText(entity));
};

const decodedText = (text: string, position: number): string =>
  NEEDS_DECODING.test(text)
    ? entities(text.includes('\r') ? text.replaceAll(LINE_BREAK, '\n') : text, position)
    : text;

const decodedValue = (value: string, position: number): string =>
  ATTRIBUTE_NEEDS.test(value)
    ? entities(value.replaceAll(LINE_BREAK, '\n').replaceAll(ATTRIBUTE_SPACE, ' '), position)
    : value;

const tagEnd = (source: string, from: number): number => {
  TAG_SPECIAL.lastIndex = from;

  for (let found = TAG_SPECIAL.exec(source); found !== null; found = TAG_SPECIAL.exec(source)) {
    if (found[0] === '>') {
      return found.index + 1;
    }

    const close = source.indexOf(found[0], found.index + 1);

    if (close < 0) {
      return -1;
    }
    TAG_SPECIAL.lastIndex = close + 1;
  }
  return -1;
};

const declarationEnd = (source: string, at: number): number => {
  if (source.startsWith('<!--', at)) {
    const close = source.indexOf('-->', at + 4);

    return close < 0 ? -1 : close + 3;
  }
  if (source.startsWith('<![CDATA[', at)) {
    const close = source.indexOf(']]>', at + 9);

    return close < 0 ? -1 : close + 3;
  }
  if (source.startsWith('<?', at)) {
    const close = source.indexOf('?>', at + 2);

    return close < 0 ? -1 : close + 2;
  }
  return tagEnd(source, at + 2);
};

const resolved = (scope: Scope, qname: string, attribute: boolean, position: number): XmlName => {
  const cache = attribute ? scope.attributes : scope.elements;
  const known = cache.get(qname);

  if (known !== undefined) {
    return known;
  }

  const colon = qname.indexOf(':');
  const unprefixed = attribute ? '' : (scope.prefixes.get('') ?? '');
  const uri = colon < 0 ? unprefixed : scope.prefixes.get(qname.slice(0, colon));

  if (uri === undefined) {
    throw new XmlSyntaxError('prefix', position);
  }

  const name: XmlName = { uri, local: colon < 0 ? qname : qname.slice(colon + 1), qname };

  cache.set(qname, name);
  return name;
};

const declares = (qname: string): boolean => qname === 'xmlns' || qname.startsWith('xmlns:');

const scopeOf = (parent: Scope, raw: readonly (readonly [string, string])[]): Scope => {
  const declared = raw.reduce<[string, string][]>((found, [qname, value]) => {
    if (declares(qname)) {
      found.push([qname === 'xmlns' ? '' : qname.slice(6), value]);
    }
    return found;
  }, []);

  return declared.length === 0
    ? parent
    : {
        prefixes: new Map([...parent.prefixes, ...declared]),
        elements: new Map(),
        attributes: new Map(),
      };
};

const rawAttributes = (
  source: string,
  from: number,
  end: number,
  position: number,
): [string, string][] => {
  const found: [string, string][] = [];
  let at = from;

  ATTRIBUTE.lastIndex = from;
  for (let match = ATTRIBUTE.exec(source); match !== null; match = ATTRIBUTE.exec(source)) {
    found.push([match[1] ?? '', decodedValue(match[2] ?? match[3] ?? '', position)]);
    at = ATTRIBUTE.lastIndex;
  }
  TRAILING.lastIndex = at;
  if (at > end || !TRAILING.test(source) || TRAILING.lastIndex !== end) {
    throw new XmlSyntaxError('syntax', position);
  }
  return found;
};

export const createXmlParser = (handlers: XmlHandlers): XmlParser => {
  const stack: Open[] = [];
  let buffer = '';
  let offset = 0;
  let pending = '';
  let pendingAt = 0;
  let failure: XmlFailure | undefined;
  let rooted = false;

  const scope = (): Scope => stack.at(-1)?.scope ?? ROOT;

  const flushText = (): void => {
    if (pending === '') {
      return;
    }
    if (stack.length > 0) {
      handlers.text?.(decodedText(pending, pendingAt));
    } else if (pending.trim() !== '') {
      throw new XmlSyntaxError('syntax', pendingAt);
    }
    pending = '';
  };

  const openTag = (start: number, end: number): void => {
    NAME_END.lastIndex = start;

    const nameEnd = NAME_END.exec(buffer)?.index ?? end - 1;
    const qname = buffer.slice(start, nameEnd);
    const position = offset + start - 1;

    if (qname === '' || (rooted && stack.length === 0)) {
      throw new XmlSyntaxError('syntax', position);
    }

    const raw = nameEnd >= end - 1 ? [] : rawAttributes(buffer, nameEnd, end, position);
    const inner = scopeOf(scope(), raw);
    const name = resolved(inner, qname, false, position);

    const attributes = raw.reduce<XmlAttribute[]>((found, [attribute, value]) => {
      if (!declares(attribute)) {
        found.push({ name: resolved(inner, attribute, true, position), value });
      }
      return found;
    }, []);

    rooted = true;
    handlers.open?.(name, attributes);
    if (buffer.charCodeAt(end - 2) === SLASH) {
      handlers.close?.(name);
    } else {
      stack.push({ name, scope: inner });
    }
  };

  const closeTag = (start: number, end: number): void => {
    const top = stack.pop();

    if (top === undefined || top.name.qname !== buffer.slice(start, end - 1).trim()) {
      throw new XmlSyntaxError('mismatch', offset + start - 2);
    }
    handlers.close?.(top.name);
  };

  const declaration = (open: number, end: number): void => {
    if (buffer.startsWith('<![CDATA[', open)) {
      if (stack.length === 0) {
        throw new XmlSyntaxError('syntax', offset + open);
      }
      handlers.text?.(buffer.slice(open + 9, end - 3));
      return;
    }
    if (!buffer.startsWith('<!--', open) && !buffer.startsWith('<?', open)) {
      throw new XmlSyntaxError('doctype', offset + open);
    }
  };

  const markupAt = (open: number): number => {
    const kind = buffer.charCodeAt(open + 1);

    const end =
      kind === BANG || kind === QUESTION ? declarationEnd(buffer, open) : tagEnd(buffer, open + 1);

    if (end < 0) {
      return -1;
    }
    flushText();
    if (kind === BANG || kind === QUESTION) {
      declaration(open, end);
    } else if (kind === SLASH) {
      closeTag(open + 2, end);
    } else {
      openTag(open + 1, end);
    }
    return end;
  };

  const keepText = (from: number, to: number): void => {
    if (to > from) {
      pendingAt = pending === '' ? offset + from : pendingAt;
      pending += buffer.slice(from, to);
    }
  };

  const consume = (): void => {
    let at = 0;

    while (at < buffer.length) {
      const open = buffer.indexOf('<', at);
      const textEnd = open < 0 ? buffer.length : open;

      keepText(at, textEnd);
      at = textEnd;
      if (open >= 0) {
        const end = markupAt(open);

        if (end < 0) {
          break;
        }
        at = end;
      }
    }
    buffer = buffer.slice(at);
    offset += at;
  };

  const guarded = (run: () => void): void => {
    if (failure !== undefined) {
      return;
    }
    try {
      run();
    } catch (error) {
      if (!(error instanceof XmlSyntaxError)) {
        throw error;
      }
      failure = error.failure;
    }
  };

  return {
    write: (chunk) => {
      guarded(() => {
        buffer += chunk;
        consume();
      });
    },
    end: () => {
      guarded(() => {
        if (buffer !== '') {
          throw new XmlSyntaxError(buffer.startsWith('<!D') ? 'doctype' : 'syntax', offset);
        }
        flushText();
        if (stack.length > 0 || !rooted) {
          throw new XmlSyntaxError('unclosed', offset);
        }
      });

      return failure;
    },
  };
};

export const parseXmlStream = async (
  stream: ReadableStream<Uint8Array>,
  handlers: XmlHandlers,
  options: XmlStreamOptions = {},
): Promise<XmlFailure | undefined> => {
  const parser = createXmlParser(handlers);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const reader = stream.getReader();
  let started = performance.now();

  const feed = async (text: string): Promise<void> => {
    for (let at = 0; at < text.length; at += PIECE) {
      parser.write(text.slice(at, at + PIECE));
      if (options.yieldTo !== undefined && performance.now() - started > (options.budgetMs ?? 8)) {
        await options.yieldTo();
        started = performance.now();
      }
    }
  };

  try {
    for (let next = await reader.read(); !next.done; next = await reader.read()) {
      options.signal?.throwIfAborted();
      await feed(decoder.decode(next.value, { stream: true }));
      options.onBytes?.(next.value.length);
    }
    parser.write(decoder.decode());
  } catch (error) {
    if (error instanceof TypeError) {
      return { reason: 'encoding', position: 0 };
    }
    throw error;
  }
  return parser.end();
};

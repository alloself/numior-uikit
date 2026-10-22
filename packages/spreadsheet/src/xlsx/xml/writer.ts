import type { Bytes } from '../zip/zip.types';
import type { XmlAttributeList, XmlWriter } from './xml.types';

export interface XmlWriterOptions {
  readonly declaration?: boolean | undefined;
  readonly chunk?: number | undefined;
}

const DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

const TEXT_SPECIAL = /[&<>\r]/gu;

const ATTRIBUTE_SPECIAL = /[&<>"\t\n\r]/gu;

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\t': '&#9;',
  '\n': '&#10;',
  '\r': '&#13;',
};

const escaped = (text: string, special: RegExp): string =>
  text.replaceAll(special, (char) => ESCAPES[char] ?? char);

export const escapeText = (text: string): string => escaped(text, TEXT_SPECIAL);

export const escapeAttribute = (text: string): string => escaped(text, ATTRIBUTE_SPECIAL);

const attributeText = (attributes: XmlAttributeList | undefined): string =>
  (attributes ?? []).reduce(
    (text, [name, value]) =>
      value === undefined ? text : `${text} ${name}="${escapeAttribute(String(value))}"`,
    '',
  );

export const createXmlWriter = (
  sink: (chunk: string) => void,
  options: XmlWriterOptions = {},
): XmlWriter => {
  const limit = options.chunk ?? 65_536;
  const open: string[] = [];
  let pieces: string[] = options.declaration === false ? [] : [DECLARATION];
  let length = 0;

  const push = (piece: string): void => {
    pieces.push(piece);
    length += piece.length;
    if (length >= limit) {
      sink(pieces.join(''));
      pieces = [];
      length = 0;
    }
  };

  const close = (): void => {
    const name = open.pop();

    if (name === undefined) {
      throw new RangeError('No element is open');
    }
    push(`</${name}>`);
  };

  return {
    open: (name, attributes) => {
      open.push(name);
      push(`<${name}${attributeText(attributes)}>`);
    },
    empty: (name, attributes) => {
      push(`<${name}${attributeText(attributes)}/>`);
    },
    text: (text) => {
      push(escapeText(text));
    },
    element: (name, text, attributes) => {
      push(`<${name}${attributeText(attributes)}>${escapeText(text)}</${name}>`);
    },
    close,
    end: () => {
      if (open.length > 0) {
        throw new RangeError(`${open.join(', ')} are still open`);
      }
      if (pieces.length > 0) {
        sink(pieces.join(''));
        pieces = [];
        length = 0;
      }
    },
  };
};

export const xmlStream = (
  build: (writer: XmlWriter) => void,
  options: XmlWriterOptions = {},
): ReadableStream<Bytes> => {
  const encoder = new TextEncoder();

  return new ReadableStream<Bytes>({
    start: (controller) => {
      const writer = createXmlWriter((chunk) => {
        controller.enqueue(encoder.encode(chunk));
      }, options);

      build(writer);
      writer.end();
      controller.close();
    },
  });
};

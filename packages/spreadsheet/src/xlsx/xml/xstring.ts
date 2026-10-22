const ESCAPED = /_x([\dA-Fa-f]{4})_/gu;

const LITERAL = /_x(?=[\dA-Fa-f]{4}_)/gu;

const highSurrogate = (code: number): boolean => code >= 0xd8_00 && code <= 0xdb_ff;

const lowSurrogate = (code: number): boolean => code >= 0xdc_00 && code <= 0xdf_ff;

const unsafeAt = (text: string, index: number): boolean => {
  const code = text.charCodeAt(index);

  if (code < 0x20) {
    return code !== 0x09 && code !== 0x0a && code !== 0x0d;
  }
  if (highSurrogate(code)) {
    return !lowSurrogate(text.charCodeAt(index + 1));
  }
  if (lowSurrogate(code)) {
    return !highSurrogate(text.charCodeAt(index - 1));
  }
  return code === 0xff_fe || code === 0xff_ff;
};

const hex = (code: number): string => code.toString(16).toUpperCase().padStart(4, '0');

export const encodeXstring = (text: string): string => {
  const literal = text.includes('_x') ? text.replaceAll(LITERAL, '_x005F_x') : text;
  const pieces: string[] = [];
  let from = 0;

  for (let index = 0; index < literal.length; index += 1) {
    if (unsafeAt(literal, index)) {
      pieces.push(literal.slice(from, index), `_x${hex(literal.charCodeAt(index))}_`);
      from = index + 1;
    }
  }
  return from === 0 ? literal : pieces.join('') + literal.slice(from);
};

export const decodeXstring = (text: string): string =>
  text.includes('_x')
    ? text.replaceAll(ESCAPED, (_found, code: string) =>
        String.fromCharCode(Number.parseInt(code, 16)),
      )
    : text;

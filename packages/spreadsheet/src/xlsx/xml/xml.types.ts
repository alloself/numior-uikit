export interface XmlName {
  readonly uri: string;
  readonly local: string;
  readonly qname: string;
}

export interface XmlAttribute {
  readonly name: XmlName;
  readonly value: string;
}

export interface XmlHandlers {
  readonly open?: ((name: XmlName, attributes: readonly XmlAttribute[]) => void) | undefined;
  readonly close?: ((name: XmlName) => void) | undefined;
  readonly text?: ((text: string) => void) | undefined;
}

export type XmlFailureReason = (typeof XmlFailureReason)[keyof typeof XmlFailureReason];

export interface XmlFailure {
  readonly reason: XmlFailureReason;
  readonly position: number;
}

export interface XmlParser {
  write(chunk: string): void;
  end(): XmlFailure | undefined;
}

export type XmlAttributeList = readonly (readonly [
  name: string,
  value: string | number | boolean | undefined,
])[];

export interface XmlWriter {
  open(name: string, attributes?: XmlAttributeList): void;
  empty(name: string, attributes?: XmlAttributeList): void;
  text(text: string): void;
  element(name: string, text: string, attributes?: XmlAttributeList): void;
  close(): void;
  end(): void;
}

export const XmlFailureReason = {
  Syntax: 'syntax',
  Entity: 'entity',
  Mismatch: 'mismatch',
  Unclosed: 'unclosed',
  Prefix: 'prefix',
  Doctype: 'doctype',
  Encoding: 'encoding',
} as const;

export const XmlBoolean = { True: 'true', One: '1', Zero: '0' } as const;

export const XmlPrefix = { Xml: 'xml', Xmlns: 'xmlns' } as const;

export const XmlChar = { Hex: 'x', TagEnd: '>' } as const;

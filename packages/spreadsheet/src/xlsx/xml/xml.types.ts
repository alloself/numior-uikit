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

export type XmlFailureReason =
  | 'syntax'
  | 'entity'
  | 'mismatch'
  | 'unclosed'
  | 'prefix'
  | 'doctype'
  | 'encoding';

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

import type { McpData } from './data.types';

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLocalized = (value: unknown): boolean =>
  isRecord(value) && Array.isArray(value.en) && Array.isArray(value.ru);

const isLocalizedRecord = (value: unknown): boolean =>
  isRecord(value) && isRecord(value.en) && isRecord(value.ru);

const isMcpData = (value: unknown): value is McpData =>
  isRecord(value) &&
  value.version === 1 &&
  isRecord(value.components) &&
  isRecord(value.catalogs) &&
  isRecord(value.exports) &&
  isRecord(value.packageStyles) &&
  Array.isArray(value.tokens) &&
  Array.isArray(value.icons) &&
  isLocalized(value.pages) &&
  isLocalizedRecord(value.examples);

export const parseData = (json: string): McpData => {
  const value: unknown = JSON.parse(json);

  if (!isMcpData(value)) {
    throw new Error('The Numior MCP data has an unexpected shape; rebuild @numior/mcp');
  }
  return value;
};

export const parseRelease = (manifest: string): string => {
  const value: unknown = JSON.parse(manifest);

  if (!isRecord(value) || typeof value.version !== 'string') {
    throw new Error('The manifest of @numior/mcp has no version');
  }
  return value.version;
};

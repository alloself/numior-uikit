import { describe, expect, it } from 'vite-plus/test';
import { parseData, parseRelease } from '../src/data';
import { fixtureData } from './fixtures/data';

describe('the files the binary reads', () => {
  it('takes the release from the package manifest', () => {
    const release = parseRelease('{ "name": "@numior/mcp", "version": "1.4.0" }');

    expect(release).toBe('1.4.0');

    expect(() => parseRelease('{ "name": "@numior/mcp" }')).toThrow(
      'The manifest of @numior/mcp has no version',
    );
  });

  it('reads the data it was built with and refuses data of another shape', () => {
    const data = parseData(JSON.stringify(fixtureData));

    expect(data).toEqual(fixtureData);

    expect(() => parseData(JSON.stringify({ ...fixtureData, version: 2 }))).toThrow(
      'The Numior MCP data has an unexpected shape; rebuild @numior/mcp',
    );
  });
});

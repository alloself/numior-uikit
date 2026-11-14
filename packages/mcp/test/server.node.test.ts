import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { McpSession } from './harness/mcp-session';

let session: McpSession;

beforeEach(async () => {
  session = await McpSession.open();
});

afterEach(async () => {
  await session.close();
});

describe('Numior MCP server', () => {
  it('introduces itself with the release it was given and lists the tools', async () => {
    const names = await session.toolNames();
    const searchParameters = await session.parameters('search');

    expect(session.serverName).toBe('numior');
    expect(session.serverVersion).toBe('1.2.3');

    expect(names).toEqual([
      'list_components',
      'get_component',
      'get_example',
      'get_page',
      'search',
      'list_tokens',
      'list_icons',
      'check_usage',
    ]);

    expect(searchParameters).toEqual(['query', 'limit', 'locale']);
  });

  it('answers a call and rejects arguments outside the schema', async () => {
    const icons = await session.call('list_icons', { query: 'trash' });
    const empty = await session.call('search', { query: '' });

    expect(icons.json()).toEqual([{ alias: 'trash', icon: 'trash-2' }]);
    expect(empty.error).toBe(true);
  });
});

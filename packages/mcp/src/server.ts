import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { McpLocale, type McpData } from './data.types';
import { createSearch } from './search';
import { PARAM_DESCRIPTIONS, SERVER_INSTRUCTIONS, TOOL_DESCRIPTIONS } from './server.messages';
import {
  checkCode,
  getComponent,
  getExample,
  getPage,
  listComponents,
  listIcons,
  listTokens,
  searchPages,
} from './tools';

const SERVER_NAME = 'numior';
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

const locale = z
  .enum([McpLocale.En, McpLocale.Ru])
  .default(McpLocale.En)
  .describe(PARAM_DESCRIPTIONS.locale);

export const createNumiorServer = (data: McpData, release: string): McpServer => {
  const server = new McpServer(
    { name: SERVER_NAME, version: release },
    { instructions: SERVER_INSTRUCTIONS },
  );

  const search = createSearch(data);

  server.registerTool(
    'list_components',
    {
      description: TOOL_DESCRIPTIONS.listComponents,
      inputSchema: { package: z.string().optional().describe(PARAM_DESCRIPTIONS.package), locale },
      annotations: READ_ONLY,
    },
    (input) => listComponents(data, input.package, input.locale),
  );

  server.registerTool(
    'get_component',
    {
      description: TOOL_DESCRIPTIONS.getComponent,
      inputSchema: { name: z.string().describe(PARAM_DESCRIPTIONS.component), locale },
      annotations: READ_ONLY,
    },
    (input) => getComponent(data, input.name, input.locale),
  );

  server.registerTool(
    'get_example',
    {
      description: TOOL_DESCRIPTIONS.getExample,
      inputSchema: { name: z.string().describe(PARAM_DESCRIPTIONS.example), locale },
      annotations: READ_ONLY,
    },
    (input) => getExample(data, input.name, input.locale),
  );

  server.registerTool(
    'get_page',
    {
      description: TOOL_DESCRIPTIONS.getPage,
      inputSchema: { path: z.string().describe(PARAM_DESCRIPTIONS.path), locale },
      annotations: READ_ONLY,
    },
    (input) => getPage(data, input.path, input.locale),
  );

  server.registerTool(
    'search',
    {
      description: TOOL_DESCRIPTIONS.search,
      inputSchema: {
        query: z.string().min(1).describe(PARAM_DESCRIPTIONS.query),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LIMIT)
          .default(DEFAULT_LIMIT)
          .describe(PARAM_DESCRIPTIONS.limit),
        locale,
      },
      annotations: READ_ONLY,
    },
    (input) => searchPages(search, input.query, input.locale, input.limit),
  );

  server.registerTool(
    'list_tokens',
    {
      description: TOOL_DESCRIPTIONS.listTokens,
      inputSchema: { group: z.string().optional().describe(PARAM_DESCRIPTIONS.group) },
      annotations: READ_ONLY,
    },
    (input) => listTokens(data, input.group),
  );

  server.registerTool(
    'list_icons',
    {
      description: TOOL_DESCRIPTIONS.listIcons,
      inputSchema: { query: z.string().optional().describe(PARAM_DESCRIPTIONS.icon) },
      annotations: READ_ONLY,
    },
    (input) => listIcons(data, input.query),
  );

  server.registerTool(
    'check_usage',
    {
      description: TOOL_DESCRIPTIONS.checkUsage,
      inputSchema: {
        code: z.string().describe(PARAM_DESCRIPTIONS.code),
        filename: z.string().optional().describe(PARAM_DESCRIPTIONS.filename),
        locale,
      },
      annotations: READ_ONLY,
    },
    (input) => checkCode(data, input.code, input.filename, input.locale),
  );

  return server;
};

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { createNumiorServer } from '../../src/server';
import type { McpData } from '../../src/data.types';
import { fixtureData } from '../fixtures/data';

type Arguments = Readonly<Record<string, unknown>>;

const FIXTURE_RELEASE = '1.2.3';

class ToolReply {
  constructor(
    readonly texts: readonly string[],
    readonly error: boolean,
  ) {}

  get text(): string {
    return this.texts[0] ?? '';
  }

  json(): unknown {
    return JSON.parse(this.text);
  }
}

export class McpSession {
  private constructor(private readonly client: Client) {}

  static async open(data: McpData = fixtureData, release = FIXTURE_RELEASE): Promise<McpSession> {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'numior-mcp-test', version: '0.0.0' });

    await createNumiorServer(data, release).connect(serverSide);
    await client.connect(clientSide);
    return new McpSession(client);
  }

  get serverName(): string | undefined {
    return this.client.getServerVersion()?.name;
  }

  get serverVersion(): string | undefined {
    return this.client.getServerVersion()?.version;
  }

  async toolNames(): Promise<string[]> {
    const { tools } = await this.client.listTools();

    return tools.map((tool) => tool.name);
  }

  async parameters(name: string): Promise<string[]> {
    const { tools } = await this.client.listTools();

    return Object.keys(tools.find((tool) => tool.name === name)?.inputSchema.properties ?? {});
  }

  async call(name: string, args: Arguments = {}): Promise<ToolReply> {
    const result = CallToolResultSchema.parse(
      await this.client.callTool({ name, arguments: args }),
    );

    const texts = result.content.flatMap((item) => (item.type === 'text' ? [item.text] : []));

    return new ToolReply(texts, result.isError === true);
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

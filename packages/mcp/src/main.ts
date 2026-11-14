import { readFileSync } from 'node:fs';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { parseData, parseRelease } from './data';
import { createNumiorServer } from './server';

const DATA_FILE = './data.json';
const MANIFEST_FILE = '../package.json';

const read = (file: string): string => readFileSync(new URL(file, import.meta.url), 'utf8');

const server = createNumiorServer(parseData(read(DATA_FILE)), parseRelease(read(MANIFEST_FILE)));

await server.connect(new StdioServerTransport());

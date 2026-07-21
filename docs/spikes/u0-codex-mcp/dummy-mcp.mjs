// U0 spike: minimal stdio MCP server exposing one no-arg tool.
// If Codex calls duet_ping and echoes MARKER, the SDK `config` injection works.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export const MARKER = 'PONG-DUET-7F3A9C';

const server = new McpServer({ name: 'duetdummy', version: '0.0.1' });

server.registerTool(
  'duet_ping',
  {
    description:
      'Duet reachability check. Takes no arguments. Returns a fixed marker string.',
    inputSchema: {},
  },
  async () => ({ content: [{ type: 'text', text: MARKER }] }),
);

const transport = new StdioServerTransport();
await server.connect(transport);

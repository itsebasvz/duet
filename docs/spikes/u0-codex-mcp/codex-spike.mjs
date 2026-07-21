// U0 spike: prove that injecting an MCP server via `new Codex({ config })`
// (per-invocation --config, NOT ~/.codex/config.toml) makes the model call it.
import { Codex } from '@openai/codex-sdk';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const dummyPath = path.join(here, 'dummy-mcp.mjs');

const codex = new Codex({
  config: {
    mcp_servers: {
      duetdummy: { command: 'node', args: [dummyPath] },
    },
  },
});

const thread = codex.startThread({
  skipGitRepoCheck: true,
  approvalPolicy: 'never',
  sandboxMode: 'danger-full-access',
  workingDirectory: here,
});

const prompt =
  'Call the duet_ping tool now (it takes no arguments). Then reply with exactly the string it returned and nothing else.';

const streamed = await thread.runStreamed(prompt);

const events = [];
for await (const ev of streamed.events) {
  events.push(ev);
  process.stdout.write(`[EV] ${ev.type}\n`);
  if (ev.type === 'error') {
    console.log('   ERROR:', JSON.stringify(ev).slice(0, 300));
  }
  const item = ev.item;
  if (item && item.type === 'mcp_tool_call') {
    console.log('   MCP_TOOL_CALL:', JSON.stringify(item));
  }
  if (item && item.type === 'agent_message') {
    console.log('   AGENT_MSG:', JSON.stringify(item.text ?? item));
  }
}

const blob = JSON.stringify(events);
console.log('\n--- VERDICT ---');
console.log('thread id:', thread.id);
console.log('mcp_tool_call present:', blob.includes('mcp_tool_call'));
console.log('duet_ping present   :', blob.includes('duet_ping'));
console.log('marker echoed        :', blob.includes('PONG-DUET-7F3A9C'));

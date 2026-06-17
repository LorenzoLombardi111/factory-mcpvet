# MCPVet MCP server

Vet an MCP server, Claude Code skill, or plugin for unsafe behavior — shell
execution, secret access, data exfiltration, prompt injection, remote code —
**before you install it**, right inside your agent.

It's a thin, auditable client: all analysis runs server-side at
[mcpvet.com](https://mcpvet.com). This process holds no credentials, touches no
local files, and makes exactly one outbound HTTPS call per scan.

## Install (Claude Code)

```bash
claude mcp add mcpvet -- npx -y github:LorenzoLombardi111/factory-mcpvet
```

Or add it to your MCP config manually:

```json
{
  "mcpServers": {
    "mcpvet": {
      "command": "npx",
      "args": ["-y", "github:LorenzoLombardi111/factory-mcpvet"]
    }
  }
}
```

## Use

Ask your agent:

> Before I install it, scan `@some/mcp-server` with MCPVet.

The `scan_extension` tool accepts:

- a **GitHub repo URL** — `https://github.com/owner/repo`
- an **npm package name** — `@scope/pkg`
- **pasted skill / manifest text**

It returns a graded verdict (clean → critical), the flagged findings with file
and line, and a shareable report link.

## Config

| Env | Default | Purpose |
|-----|---------|---------|
| `MCPVET_API` | `https://mcpvet.com` | API origin (override for self-host/testing) |

MIT licensed.

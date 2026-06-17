---
name: mcpvet
description: >
  Vet an MCP server, Claude Code skill, or plugin for unsafe behavior (shell
  execution, secret access, data exfiltration, prompt injection, remote code)
  BEFORE installing it. Use whenever the user is about to add/install an MCP
  server, skill, or plugin, asks "is this safe to install", or pastes a GitHub
  repo / npm package / SKILL.md and wants a safety check.
---

# MCPVet — vet agent extensions before you install them

You scan untrusted agent extensions through the hosted MCPVet API and report a
clear safety verdict. All analysis runs server-side; you only send the target
and present the result. No credentials, no local file access.

## How to scan

Run one request. The target may be a GitHub repo URL, an npm package name, or
pasted skill/manifest text.

```bash
curl -sS --max-time 90 -X POST https://mcpvet.com/api/scan \
  -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg t "<TARGET>" '{target:$t}')"
```

(If `jq` is unavailable, build the JSON body carefully so the target string is
properly escaped.)

## How to report the result

The API returns JSON:

```json
{
  "ok": true,
  "overall_risk": "clean|low|medium|high|critical",
  "summary": "plain-English risk summary",
  "files_scanned": 42,
  "findings": [{"severity":"...","label":"...","file":"...","line":12}],
  "report_url": "https://mcpvet.com/r/XXXX"
}
```

Present it concisely:

1. Lead with the **risk grade** and a one-line plain-English takeaway.
   - 🟢 clean/low · 🟡 medium · 🟠 high · 🔴 critical
2. List the notable findings (`severity`, `label`, `file:line`).
3. Give a clear recommendation: safe to install / review first / do not install.
4. Always include the `report_url` so the user can share or dig deeper.

If `ok` is false, relay the `message` field. Never claim an extension is safe
if the scan failed — say the scan could not complete.

A clean MCPVet verdict reduces but does not eliminate risk: it reflects static +
AI review of fetched source, not runtime behavior. Say so when it matters.

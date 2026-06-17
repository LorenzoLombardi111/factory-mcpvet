#!/usr/bin/env node
/**
 * MCPVet MCP server.
 *
 * A thin, auditable stdio MCP server that lets an agent vet an MCP server,
 * Claude Code skill, or plugin for unsafe behavior BEFORE it gets installed.
 * All analysis happens server-side at https://mcpvet.com — this process only
 * forwards a target string and renders the verdict. It holds no credentials,
 * touches no local files, and makes exactly one outbound HTTPS call per scan.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API = process.env.MCPVET_API || "https://mcpvet.com";
const TIMEOUT_MS = 90_000;

const RISK_EMOJI = {
  clean: "🟢", low: "🟢", medium: "🟡", high: "🟠", critical: "🔴",
};

async function scan(target) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      const msg = data.message || `MCPVet API error (HTTP ${res.status})`;
      throw new Error(msg);
    }
    return data;
  } finally {
    clearTimeout(t);
  }
}

function render(r) {
  const emoji = RISK_EMOJI[r.overall_risk] || "⚪";
  const lines = [
    `${emoji} MCPVet verdict: ${String(r.overall_risk || "unknown").toUpperCase()} risk`,
    `Target: ${r.target}`,
    `Files scanned: ${r.files_scanned ?? "?"}`,
    "",
    r.summary || "No AI summary available.",
  ];
  const findings = r.findings || [];
  if (findings.length) {
    lines.push("", `Findings (${findings.length}):`);
    for (const f of findings.slice(0, 25)) {
      lines.push(`  • [${f.severity}] ${f.label} — ${f.file}:${f.line}`);
    }
  } else {
    lines.push("", "No risky code patterns flagged.");
  }
  lines.push("", `Full report: ${r.report_url}`);
  return lines.join("\n");
}

const server = new McpServer({ name: "mcpvet", version: "0.1.0" });

server.tool(
  "scan_extension",
  "Vet an MCP server, Claude Code skill, or plugin for unsafe behavior (shell exec, " +
    "secret access, data exfiltration, prompt injection, remote code) BEFORE installing it. " +
    "Returns a graded safety verdict and a shareable report link from MCPVet.",
  {
    target: z
      .string()
      .describe(
        "What to scan: a GitHub repo URL (https://github.com/owner/repo), an npm package " +
          "name (e.g. @scope/pkg), or pasted skill/manifest text."
      ),
  },
  async ({ target }) => {
    target = (target || "").trim();
    if (!target) {
      return {
        isError: true,
        content: [{ type: "text", text: "Provide a target: a GitHub URL, npm package name, or skill text." }],
      };
    }
    try {
      const result = await scan(target);
      return { content: [{ type: "text", text: render(result) }] };
    } catch (e) {
      const msg = e?.name === "AbortError" ? "MCPVet scan timed out — try again." : (e?.message || String(e));
      return { isError: true, content: [{ type: "text", text: `Scan failed: ${msg}` }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("mcpvet-mcp ready (API:", API + ")");

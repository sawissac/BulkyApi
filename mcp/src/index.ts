#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { findItem, readCollections } from "./state.js";
import { registerCollectionTools } from "./tools/collections.js";
import { registerEnvironmentTools } from "./tools/environments.js";
import { registerExecuteTools } from "./tools/execute.js";

/**
 * BulkyApi MCP server (stdio).
 *
 * Gives Claude the same three things the BulkyApi UI gives a person: the saved
 * collections and environments, the ability to edit them, and the api.* script
 * runner that turns them into real HTTP traffic.
 *
 * State is read from and written to Supabase under the configured account, so
 * Row Level Security is what scopes access — the server holds no data of its
 * own. Execution happens in this process, not through the app's `/api/proxy`
 * route: that route exists to escape browser CORS and is gated by the app's
 * auth middleware, neither of which applies to a local Node process.
 */

const server = new McpServer(
  { name: "bulky-api", version: "0.1.0" },
  {
    instructions:
      "BulkyApi is an HTTP client whose requests are written as JavaScript scripts against an `api.*` DSL. " +
      "Start with bulky_list_collections to see what exists, bulky_get_item to read one script, and bulky_run_item or " +
      "bulky_run_script to execute. bulky_http_request is the shortcut for a one-off call that needs no saved state. " +
      "Prefer bulky_analyze_script before running anything you just wrote. Writes go straight to the user's Supabase rows; " +
      "an already-open BulkyApi tab should be reloaded before it is edited, because the app saves whole snapshots.",
  },
);

registerCollectionTools(server);
registerEnvironmentTools(server);
registerExecuteTools(server);

server.registerResource(
  "collections",
  "bulky://collections",
  {
    title: "BulkyApi collections",
    description: "The full collection tree — items and environments, without script bodies or variable values.",
    mimeType: "application/json",
  },
  async (uri) => {
    const collections = await readCollections();
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(
            collections.map((collection) => ({
              id: collection.id,
              name: collection.name,
              items: collection.items.map(({ id, name, method }) => ({ id, name, method })),
              environments: collection.environments.map(({ id, name, vars }) => ({
                id,
                name,
                varNames: Object.keys(vars),
              })),
            })),
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerResource(
  "item",
  new ResourceTemplate("bulky://item/{itemId}", { list: undefined }),
  {
    title: "BulkyApi item script",
    description: "The api.* script body of one saved item.",
    mimeType: "text/javascript",
  },
  async (uri, { itemId }) => {
    const { item } = await findItem({ itemId: String(itemId) });
    return {
      contents: [{ uri: uri.href, mimeType: "text/javascript", text: item.code }],
    };
  },
);

async function main(): Promise<void> {
  // stdout is the MCP channel — anything written there that is not a protocol
  // message corrupts the stream, so diagnostics go to stderr.
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("bulky-api MCP server ready on stdio\n");
}

main().catch((error: unknown) => {
  process.stderr.write(`bulky-api MCP server failed to start: ${(error as Error).message}\n`);
  process.exit(1);
});

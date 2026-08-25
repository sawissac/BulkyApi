import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  createCollection,
  deleteCollection,
  deleteItem,
  describeAuth,
  findItem,
  readCollections,
  saveItem,
} from "../state.js";
import { guard, ok } from "./shared.js";

/**
 * A write made here lands in Supabase directly. The web app pushes its whole
 * Redux tree through the `sync_state` RPC, which deletes any row absent from
 * that snapshot — so a tab that was already open before this write can undo it
 * on its next save. Reloading the app before editing there keeps the two in
 * step.
 */
const SYNC_WARNING =
  "Reload any open BulkyApi tab before editing there: the app syncs whole snapshots and a stale tab would overwrite this change.";

export function registerCollectionTools(server: McpServer): void {
  server.registerTool(
    "bulky_whoami",
    {
      title: "BulkyApi connection status",
      description:
        "Reports how this server is configured: Supabase project, signed-in account, which .env file was loaded, and the default call limits. Use it first when a state tool fails.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    guard(async () => ok(await describeAuth())),
  );

  server.registerTool(
    "bulky_list_collections",
    {
      title: "List collections",
      description:
        "The user's whole BulkyApi tree: collections, their items (saved api.* scripts), and their environments. Script bodies are omitted unless includeCode is true — fetch one with bulky_get_item instead.",
      inputSchema: {
        includeCode: z
          .boolean()
          .optional()
          .describe("Include each item's full script body. Off by default because bodies are long."),
        includeVarValues: z
          .boolean()
          .optional()
          .describe("Include environment variable values, not just their names. Values often hold tokens."),
      },
      annotations: { readOnlyHint: true },
    },
    guard(async ({ includeCode, includeVarValues }) => {
      const collections = await readCollections();
      return ok(
        collections.map((collection) => ({
          id: collection.id,
          name: collection.name,
          activeEnvIdx: collection.envIdx,
          items: collection.items.map((item) => ({
            id: item.id,
            name: item.name,
            method: item.method,
            ...(includeCode ? { code: item.code } : { codeChars: item.code.length }),
          })),
          environments: collection.environments.map((env) => ({
            id: env.id,
            name: env.name,
            ...(includeVarValues ? { vars: env.vars } : { varNames: Object.keys(env.vars) }),
          })),
        })),
      );
    }),
  );

  server.registerTool(
    "bulky_get_item",
    {
      title: "Read a saved item",
      description:
        "Full script body and metadata for one saved item, by id or by name. Names are matched case-insensitively and an ambiguous name is reported rather than guessed.",
      inputSchema: {
        itemId: z.string().optional().describe("Item id from bulky_list_collections."),
        name: z.string().optional().describe("Item name, used when no id is known."),
        collectionId: z.string().optional().describe("Restricts a name lookup to one collection."),
      },
      annotations: { readOnlyHint: true },
    },
    guard(async ({ itemId, name, collectionId }) => {
      if (!itemId && !name) throw new Error("Pass itemId or name.");
      const { item, collection } = await findItem({ itemId, name, collectionId });
      return ok({
        id: item.id,
        name: item.name,
        method: item.method,
        code: item.code,
        collection: { id: collection.id, name: collection.name },
        environments: collection.environments.map((e) => ({ id: e.id, name: e.name })),
      });
    }),
  );

  server.registerTool(
    "bulky_save_item",
    {
      title: "Create or update an item",
      description:
        "Writes a saved item. With itemId it updates that item (only the fields you pass); without one it creates a new item in collectionId. The code is a BulkyApi automation script using the api.* DSL.",
      inputSchema: {
        itemId: z.string().optional().describe("Update this item. Omit to create a new one."),
        collectionId: z
          .string()
          .optional()
          .describe("Target collection. Required when creating; when updating, moves the item."),
        name: z.string().optional().describe("Item name shown in the sidebar."),
        method: z.string().optional().describe("HTTP method badge, e.g. GET or POST. Cosmetic — the script decides the real calls."),
        code: z.string().optional().describe("The api.* script body."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    guard(async (args) => {
      const saved = await saveItem(args);
      return ok({ ...saved, warning: SYNC_WARNING });
    }),
  );

  server.registerTool(
    "bulky_delete_item",
    {
      title: "Delete an item",
      description: "Permanently deletes one saved item. There is no undo.",
      inputSchema: { itemId: z.string().describe("Item id to delete.") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    guard(async ({ itemId }) => {
      const { item, collection } = await findItem({ itemId });
      await deleteItem(itemId);
      return ok({
        deleted: { id: item.id, name: item.name, collection: collection.name },
        warning: SYNC_WARNING,
      });
    }),
  );

  server.registerTool(
    "bulky_create_collection",
    {
      title: "Create a collection",
      description: "Creates an empty collection to hold items and environments.",
      inputSchema: { name: z.string().describe("Collection name.") },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    guard(async ({ name }) => ok({ ...(await createCollection(name)), warning: SYNC_WARNING })),
  );

  server.registerTool(
    "bulky_delete_collection",
    {
      title: "Delete a collection",
      description:
        "Permanently deletes a collection along with every item and environment inside it (the rows cascade). There is no undo.",
      inputSchema: { collectionId: z.string().describe("Collection id to delete.") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    guard(async ({ collectionId }) => {
      const collections = await readCollections();
      const target = collections.find((c) => c.id === collectionId);
      if (!target) throw new Error(`No collection with id ${collectionId}.`);
      await deleteCollection(collectionId);
      return ok({
        deleted: {
          id: target.id,
          name: target.name,
          items: target.items.length,
          environments: target.environments.length,
        },
        warning: SYNC_WARNING,
      });
    }),
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { deleteEnvVars, deleteEnvironment, readCollections, upsertEnvironment } from "../state.js";
import { guard, ok } from "./shared.js";

const SYNC_WARNING =
  "Reload any open BulkyApi tab before editing there: the app syncs whole snapshots and a stale tab would overwrite this change.";

export function registerEnvironmentTools(server: McpServer): void {
  server.registerTool(
    "bulky_list_environments",
    {
      title: "List environments",
      description:
        "Environments and their variables. Values are hidden unless includeValues is true, because environments commonly hold tokens and keys. A script reaches these as env.<name> and {{name}} in URLs.",
      inputSchema: {
        collectionId: z.string().optional().describe("Only environments in this collection."),
        includeValues: z.boolean().optional().describe("Return variable values, not just names."),
      },
      annotations: { readOnlyHint: true },
    },
    guard(async ({ collectionId, includeValues }) => {
      const collections = await readCollections();
      const scoped = collectionId ? collections.filter((c) => c.id === collectionId) : collections;
      return ok(
        scoped.flatMap((collection) =>
          collection.environments.map((env, idx) => ({
            id: env.id,
            name: env.name,
            collection: { id: collection.id, name: collection.name },
            active: collection.envIdx === idx,
            ...(includeValues ? { vars: env.vars } : { varNames: Object.keys(env.vars) }),
          })),
        ),
      );
    }),
  );

  server.registerTool(
    "bulky_set_env_vars",
    {
      title: "Set environment variables",
      description:
        "Merges variables into an environment, creating the environment when it does not exist. Pass replace to swap the whole map instead of merging.",
      inputSchema: {
        environmentId: z.string().optional().describe("Environment to write. Omit to look up or create by name."),
        collectionId: z
          .string()
          .optional()
          .describe("Collection that owns the environment. Required when creating one."),
        name: z.string().optional().describe("Environment name — used to find an existing one, or to name a new one."),
        vars: z.record(z.string(), z.string()).describe("Variable map to merge in."),
        replace: z.boolean().optional().describe("Replace every existing variable instead of merging."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    guard(async (args) => ok({ ...(await upsertEnvironment(args)), warning: SYNC_WARNING })),
  );

  server.registerTool(
    "bulky_delete_env_vars",
    {
      title: "Delete environment variables",
      description: "Removes named variables from one environment, leaving the rest intact.",
      inputSchema: {
        environmentId: z.string().describe("Environment to edit."),
        keys: z.array(z.string()).describe("Variable names to remove."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    guard(async ({ environmentId, keys }) => {
      const env = await deleteEnvVars(environmentId, keys);
      return ok({ id: env.id, name: env.name, remainingVarNames: Object.keys(env.vars), warning: SYNC_WARNING });
    }),
  );

  server.registerTool(
    "bulky_delete_environment",
    {
      title: "Delete an environment",
      description: "Permanently deletes one environment and all of its variables. There is no undo.",
      inputSchema: { environmentId: z.string().describe("Environment id to delete.") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    guard(async ({ environmentId }) => {
      const collections = await readCollections();
      const target = collections.flatMap((c) => c.environments).find((e) => e.id === environmentId);
      if (!target) throw new Error(`No environment with id ${environmentId}.`);
      await deleteEnvironment(environmentId);
      return ok({
        deleted: { id: target.id, name: target.name, varCount: Object.keys(target.vars).length },
        warning: SYNC_WARNING,
      });
    }),
  );
}

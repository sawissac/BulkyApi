@AGENTS.md

## React component JSDoc

Component documentation is a JSDoc/TSDoc block inside the component file, never a separate markdown doc — see skill `react-components-docs` (`.claude/skills/react-components-docs/SKILL.md`).

Non-negotiables:

- One `/** ... */` block directly above each exported component, plus one per member of the props type.
- No `docs/components/` markdown, no per-component `.md`, no component index.
- No prose `//` comments in `.tsx`/`.jsx`. Questions and caveats go inside the JSDoc, marked `Unverified:`. Only eslint-disable, `@ts-expect-error`, and `TODO(name):` may stay as line comments.
- Component block order: summary → `@remarks` (Status/Type, State & behavior, Variants, Composition, Accessibility, Test ids, CSS classes, Edge cases, Dependencies) → `@example` → `@see`.
- Never restate a prop's type in prose. Literal defaults go in `@defaultValue`; optionality is the `?` in the type.
- Every callback documents when it fires, plus `@param` per argument.
- Changing a prop signature requires updating the JSDoc in the same pass.
- Don't use chrome mcp use it when i say so

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

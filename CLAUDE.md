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

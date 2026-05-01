/**
 * Converts a JSON value into TypeScript type/interface definitions.
 */

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sanitizeKey(key: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
}

function camelToPascal(s: string): string {
  return s
    .replace(/([_-])(\w)/g, (_, __, c: string) => c.toUpperCase())
    .replace(/^./, (c) => c.toUpperCase());
}

type InterfaceMap = Map<string, string>;

function inferType(
  value: unknown,
  name: string,
  interfaces: InterfaceMap,
): string {
  if (value === null || value === undefined) return 'unknown';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return Number.isInteger(value) ? 'number' : 'number';
  if (typeof value === 'boolean') return 'boolean';

  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    const itemTypes = new Set(
      value.map((item) => inferType(item, name + 'Item', interfaces)),
    );
    if (itemTypes.size === 1) return `${[...itemTypes][0]}[]`;
    return `(${[...itemTypes].join(' | ')})[]`;
  }

  if (typeof value === 'object') {
    const interfaceName = camelToPascal(name);
    buildInterface(value as Record<string, unknown>, interfaceName, interfaces);
    return interfaceName;
  }

  return 'unknown';
}

function buildInterface(
  obj: Record<string, unknown>,
  name: string,
  interfaces: InterfaceMap,
): void {
  const lines: string[] = [];
  const entries = Object.entries(obj);

  for (const [key, value] of entries) {
    const childName = name + capitalize(key);
    const type = inferType(value, childName, interfaces);
    lines.push(`  ${sanitizeKey(key)}: ${type};`);
  }

  interfaces.set(name, `interface ${name} {\n${lines.join('\n')}\n}`);
}

/**
 * Merges duplicate array-item interfaces by unioning all fields.
 * When an array contains objects with slightly different shapes,
 * this produces a single interface with optional fields.
 */
function mergeArrayItemInterfaces(
  value: unknown,
  name: string,
  interfaces: InterfaceMap,
): void {
  if (Array.isArray(value)) {
    const objects = value.filter(
      (v): v is Record<string, unknown> =>
        typeof v === 'object' && v !== null && !Array.isArray(v),
    );
    if (objects.length > 1) {
      const allKeys = new Map<string, Set<string>>();
      for (const obj of objects) {
        for (const [key, val] of Object.entries(obj)) {
          const childName = name + 'Item' + capitalize(key);
          const type = inferType(val, childName, interfaces);
          if (!allKeys.has(key)) allKeys.set(key, new Set());
          allKeys.get(key)!.add(type);
        }
      }
      const requiredKeys = new Set<string>();
      for (const key of allKeys.keys()) {
        if (objects.every((o) => key in o)) requiredKeys.add(key);
      }
      const lines: string[] = [];
      for (const [key, types] of allKeys) {
        const typeStr = [...types].join(' | ');
        const optional = requiredKeys.has(key) ? '' : '?';
        lines.push(`  ${sanitizeKey(key)}${optional}: ${typeStr};`);
      }
      const ifaceName = camelToPascal(name + 'Item');
      interfaces.set(
        ifaceName,
        `interface ${ifaceName} {\n${lines.join('\n')}\n}`,
      );
    }
    for (const item of value) {
      mergeArrayItemInterfaces(item, name + 'Item', interfaces);
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      mergeArrayItemInterfaces(val, name + capitalize(key), interfaces);
    }
  }
}

export function jsonToTypeScript(data: unknown, rootName = 'Root'): string {
  if (data === null || data === undefined) return 'type Root = unknown;';
  if (typeof data !== 'object') {
    const t = inferType(data, rootName, new Map());
    return `type ${rootName} = ${t};`;
  }

  const interfaces: InterfaceMap = new Map();

  if (Array.isArray(data)) {
    const itemType = inferType(data, rootName, interfaces);
    mergeArrayItemInterfaces(data, rootName, interfaces);
    const parts = [...interfaces.values()];
    parts.push(`type ${rootName} = ${itemType};`);
    return parts.join('\n\n');
  }

  buildInterface(data as Record<string, unknown>, rootName, interfaces);
  mergeArrayItemInterfaces(data, rootName, interfaces);

  return [...interfaces.values()].join('\n\n');
}

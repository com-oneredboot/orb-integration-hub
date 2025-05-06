// caseConverter.ts
// Utility for converting object keys between camelCase and snake_case

function isObject(value: any): value is Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function toSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
}

export function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  } else if (isObject(obj)) {
    const result: Record<string, any> = {};
    Object.keys(obj).forEach(key => {
      const newKey = toSnake(key);
      result[newKey] = toSnakeCase(obj[key]);
    });
    return result;
  }
  return obj;
}

export function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  } else if (isObject(obj)) {
    const result: Record<string, any> = {};
    Object.keys(obj).forEach(key => {
      const newKey = toCamel(key);
      result[newKey] = toCamelCase(obj[key]);
    });
    return result;
  }
  return obj;
} 
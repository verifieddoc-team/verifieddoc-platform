export function getRouteParam(value: string | string[] | undefined, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} route parameter is required`);
  }

  return value;
}

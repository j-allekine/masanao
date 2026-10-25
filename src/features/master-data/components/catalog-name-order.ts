/** Match the database's name/key ordering when inserting a saved creation. */
export function compareCatalogName(
  left: { id: string; name: string },
  right: { id: string; name: string },
  normalize: (name: string) => string,
) {
  const leftKey = normalize(left.name);
  const rightKey = normalize(right.name);
  if (leftKey !== rightKey) return leftKey < rightKey ? -1 : 1;
  return left.id < right.id ? -1 : left.id === right.id ? 0 : 1;
}

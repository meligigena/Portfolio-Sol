function hasMediaPath(value, visited) {
  if (!value || typeof value !== "object") return false;
  if (visited.has(value)) return false;
  visited.add(value);

  if (Array.isArray(value)) {
    return value.some((item) => hasMediaPath(item, visited));
  }

  if (
    (typeof value.src === "string" && value.src.trim().length > 0) ||
    (typeof value.storage_path === "string" &&
      value.storage_path.trim().length > 0)
  ) {
    return true;
  }

  return Object.values(value).some((item) => hasMediaPath(item, visited));
}

export function hasRenderableContentBlock(block) {
  return hasMediaPath(block, new WeakSet());
}

export function hasRenderableContentBlocks(blocks = []) {
  return blocks.some(hasRenderableContentBlock);
}

export function hasRenderableEditionContent(edition) {
  return (
    hasRenderableContentBlocks(edition?.content) ||
    (edition?.projects ?? []).some(hasRenderableContentBlock)
  );
}

export function hasRenderableProjectContent(client) {
  return (
    hasRenderableContentBlocks(client?.content) ||
    (client?.projects ?? []).some(hasRenderableContentBlock) ||
    (client?.editions ?? []).some(hasRenderableEditionContent)
  );
}

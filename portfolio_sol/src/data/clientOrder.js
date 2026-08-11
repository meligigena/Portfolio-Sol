export function moveClient(clients, fromIndex, toIndex) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= clients.length ||
    toIndex >= clients.length
  ) {
    return [...clients];
  }

  const reordered = [...clients];
  const [client] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, client);
  return reordered;
}

export function getAdjacentClients(clients, clientSlug) {
  const clientIndex = clients.findIndex((client) => client.slug === clientSlug);
  if (clientIndex < 0 || clients.length === 0) {
    return { previousClient: null, nextClient: null };
  }

  return {
    previousClient: clients[(clientIndex - 1 + clients.length) % clients.length],
    nextClient: clients[(clientIndex + 1) % clients.length],
  };
}

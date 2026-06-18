type EngagementRefreshListener = () => void;

const listeners = new Set<EngagementRefreshListener>();

export function subscribeEngagementRefresh(
  listener: EngagementRefreshListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyEngagementRefresh(): void {
  for (const listener of listeners) {
    listener();
  }
}

// Minimal reactive event bus: publish/subscribe with unsubscribe support.
export class EventBus {
  #handlers = new Map();

  on(type, handler) {
    if (typeof handler !== 'function') throw new TypeError('EventBus.on: handler must be a function');
    // Each registration gets its own entry, so registering the same function
    // twice yields two independent subscriptions with independent unsubscribes.
    const entry = { handler };
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type).add(entry);
    return () => this.#handlers.get(type)?.delete(entry);
  }

  emit(type, payload) {
    // Snapshot so handlers that (un)subscribe during emit don't affect this pass.
    const entries = [...(this.#handlers.get(type) ?? [])];
    for (const { handler } of entries) {
      try {
        // Promise.resolve(...).catch handles async handlers that reject.
        Promise.resolve(handler(payload)).catch((err) => this.#report(type, err));
      } catch (err) {
        this.#report(type, err);
      }
    }
  }

  #report(type, err) {
    console.error(`EventBus: handler for "${type}" failed:`, err);
  }
}

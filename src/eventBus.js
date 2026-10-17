// Minimal reactive event bus: publish/subscribe with unsubscribe support.
export class EventBus {
  #handlers = new Map();

  on(type, handler) {
    if (typeof handler !== 'function') throw new TypeError('EventBus.on: handler must be a function');
    // Each registration gets its own entry, so registering the same function
    // twice yields two independent subscriptions with independent unsubscribes.
    const entry = { handler };
    let set = this.#handlers.get(type);
    if (!set) this.#handlers.set(type, (set = new Set()));
    set.add(entry);
    return () => {
      set.delete(entry);
      // Drop the empty Set so per-entity event types do not accumulate.
      if (set.size === 0 && this.#handlers.get(type) === set) this.#handlers.delete(type);
    };
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

// Minimal reactive event bus: publish/subscribe with unsubscribe support.
export class EventBus {
  #handlers = new Map();

  on(type, handler) {
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type).add(handler);
    return () => this.#handlers.get(type)?.delete(handler);
  }

  emit(type, payload) {
    for (const handler of this.#handlers.get(type) ?? []) handler(payload);
  }
}

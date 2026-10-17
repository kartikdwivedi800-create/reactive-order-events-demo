import { OrderEvents } from './events.js';

// Subscribers get a copy so later transitions or mutations can not leak through.
const snapshot = (order) => ({ ...order, items: [...order.items] });

// Holds order state and emits an event on every state transition.
export class OrderService {
  #orders = new Map();
  #nextId = 1;

  constructor(bus) {
    this.bus = bus;
  }

  create(items) {
    if (!Array.isArray(items) || items.length === 0) throw new TypeError('create: items must be a non-empty array');
    const order = { id: this.#nextId++, items, status: 'CREATED' };
    this.#orders.set(order.id, order);
    this.bus.emit(OrderEvents.CREATED, snapshot(order));
    return order;
  }

  pay(id) {
    return this.#transition(id, 'CREATED', 'PAID', OrderEvents.PAID);
  }

  ship(id) {
    return this.#transition(id, 'PAID', 'SHIPPED', OrderEvents.SHIPPED);
  }

  get(id) {
    return this.#orders.get(id);
  }

  #transition(id, from, to, event) {
    const order = this.#orders.get(id);
    if (!order) throw new Error(`Order ${id} not found`);
    if (order.status !== from) throw new Error(`Order ${id} must be ${from}, is ${order.status}`);
    order.status = to;
    this.bus.emit(event, snapshot(order));
    return order;
  }
}

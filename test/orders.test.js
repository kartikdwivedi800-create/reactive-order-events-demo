import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/eventBus.js';
import { OrderEvents } from '../src/events.js';
import { OrderService } from '../src/orderService.js';

test('order lifecycle emits events in order', () => {
  const bus = new EventBus();
  const seen = [];
  for (const t of Object.values(OrderEvents)) bus.on(t, () => seen.push(t));
  const svc = new OrderService(bus);
  const { id } = svc.create(['a']);
  svc.pay(id);
  svc.ship(id);
  assert.deepEqual(seen, [OrderEvents.CREATED, OrderEvents.PAID, OrderEvents.SHIPPED]);
});

test('cannot ship an unpaid order', () => {
  const svc = new OrderService(new EventBus());
  const { id } = svc.create(['a']);
  assert.throws(() => svc.ship(id), /must be PAID/);
});

test('unsubscribe stops delivery', () => {
  const bus = new EventBus();
  let n = 0;
  const off = bus.on('x', () => n++);
  bus.emit('x');
  off();
  bus.emit('x');
  assert.equal(n, 1);
});

test('subscribers get a snapshot, not the live order', async () => {
  const bus = new EventBus();
  const svc = new OrderService(bus);
  let seen;
  bus.on(OrderEvents.CREATED, async (o) => {
    await Promise.resolve();
    seen = o.status;
    o.status = 'SHIPPED';
    o.items.push('hacked');
  });
  const { id } = svc.create(['a']);
  svc.pay(id);
  await new Promise((r) => setImmediate(r));
  assert.equal(seen, 'CREATED');
  assert.equal(svc.get(id).status, 'PAID');
  assert.deepEqual(svc.get(id).items, ['a']);
});

test('create rejects missing or empty items', () => {
  const svc = new OrderService(new EventBus());
  for (const bad of [undefined, null, [], 'abc']) assert.throws(() => svc.create(bad), TypeError);
});

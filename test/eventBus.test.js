import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/eventBus.js';

// Silence expected error logging during tests.
function quiet(fn) {
  const orig = console.error;
  const logged = [];
  console.error = (...a) => logged.push(a);
  try { return fn(logged); } finally { console.error = orig; }
}

test('unsubscribe stops delivery', () => {
  const bus = new EventBus();
  let n = 0;
  const off = bus.on('x', () => n++);
  bus.emit('x');
  off();
  bus.emit('x');
  assert.equal(n, 1);
});

test('throwing handler does not stop later handlers or the emitter', () => {
  const bus = new EventBus();
  const calls = [];
  bus.on('x', () => { throw new Error('boom'); });
  bus.on('x', () => calls.push('second'));
  quiet((logged) => {
    assert.doesNotThrow(() => bus.emit('x'));
    assert.equal(logged.length, 1);
  });
  assert.deepEqual(calls, ['second']);
});

test('rejecting async handler is caught and logged', async () => {
  const bus = new EventBus();
  const orig = console.error;
  const logged = [];
  console.error = (...a) => logged.push(a);
  try {
    bus.on('x', async () => { throw new Error('async boom'); });
    bus.emit('x');
    await new Promise((r) => setImmediate(r));
  } finally { console.error = orig; }
  assert.equal(logged.length, 1);
});

test('re-subscribing inside a handler does not loop within one emit', () => {
  const bus = new EventBus();
  let n = 0;
  bus.on('x', function self() {
    n++;
    bus.on('x', self);
    if (n > 100) throw new Error('runaway'); // would be swallowed; assert on n below
  });
  quiet(() => bus.emit('x'));
  assert.equal(n, 1);
});

test('handler removed mid-emit by an earlier handler is still delivered this pass', () => {
  const bus = new EventBus();
  const calls = [];
  let offB;
  bus.on('x', () => { calls.push('a'); offB(); });
  offB = bus.on('x', () => calls.push('b'));
  bus.emit('x');
  assert.deepEqual(calls, ['a', 'b']);
  bus.emit('x');
  assert.deepEqual(calls, ['a', 'b', 'a']);
});

test('duplicate registration has independent unsubscribes', () => {
  const bus = new EventBus();
  let n = 0;
  const h = () => n++;
  const off1 = bus.on('x', h);
  const off2 = bus.on('x', h);
  bus.emit('x');
  assert.equal(n, 2);
  off1();
  bus.emit('x');
  assert.equal(n, 3); // second registration still active
  off1(); // stale/repeated unsubscribe must not remove the other
  bus.emit('x');
  assert.equal(n, 4);
  off2();
  bus.emit('x');
  assert.equal(n, 4);
});

test('on() rejects non-function handlers', () => {
  const bus = new EventBus();
  assert.throws(() => bus.on('x', undefined), TypeError);
  assert.throws(() => bus.on('x', 'nope'), TypeError);
});

test('empty handler sets are evicted after last unsubscribe', () => {
  const bus = new EventBus();
  const calls = [];
  const off = bus.on('order.1', () => calls.push(1));
  off();
  bus.emit('order.1');
  assert.deepEqual(calls, []);
  // resubscribing after eviction still works
  bus.on('order.1', () => calls.push(2));
  bus.emit('order.1');
  assert.deepEqual(calls, [2]);
});

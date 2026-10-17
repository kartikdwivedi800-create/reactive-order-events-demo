import { EventBus } from './eventBus.js';
import { OrderEvents } from './events.js';
import { OrderService } from './orderService.js';

const bus = new EventBus();
for (const type of Object.values(OrderEvents)) {
  bus.on(type, (o) => console.log(`[${type}] order #${o.id} -> ${o.status}`));
}

const orders = new OrderService(bus);
const order = orders.create(['book', 'pen']);
orders.pay(order.id);
orders.ship(order.id);

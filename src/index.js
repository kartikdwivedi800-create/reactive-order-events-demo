import { EventBus } from './eventBus.js';
import { OrderEvents } from './events.js';

const bus = new EventBus();
bus.on(OrderEvents.CREATED, (o) => console.log(`[${OrderEvents.CREATED}]`, o));
bus.emit(OrderEvents.CREATED, { id: 1, items: ['book'] });

import { EventEmitter } from 'node:events';
import { EVENTS } from '../constants/index.js';

export { EVENTS };

export class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Safely emits an event, catching any listener errors.
   * 
   * @param {string} event 
   * @param  {...any} args 
   * @returns {boolean}
   */
  emitSafe(event, ...args) {
    try {
      return this.emit(event, ...args);
    } catch (err) {
      // Allow fallback error handling, or print to stderr
      console.error(`Error in event listener for "${event}":`, err);
      return false;
    }
  }
}

export const eventBus = new EventBus();

export default {
  EVENTS,
  EventBus,
  eventBus,
};

/**
 * Event emitter for SDK events.
 *
 * @module events/event-emitter
 */

import type { EventMap, EventName, EventListener, Unsubscribe } from './types';

/**
 * Simple event emitter for SDK events.
 *
 * @example
 * ```typescript
 * const emitter = new EventEmitter();
 *
 * // Subscribe to events
 * const unsubscribe = emitter.on('signIn', (data) => {
 *   console.log('User signed in:', data.user);
 * });
 *
 * // Emit events
 * emitter.emit('signIn', { user, tokens });
 *
 * // Unsubscribe
 * unsubscribe();
 * ```
 */
export class EventEmitter {
  private listeners: Map<EventName, Set<EventListener<EventName>>> = new Map();

  /**
   * Subscribe to an event.
   *
   * @param event - Event name to subscribe to
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  on<T extends EventName>(event: T, listener: EventListener<T>): Unsubscribe {
    let eventListeners = this.listeners.get(event);
    if (eventListeners === undefined) {
      eventListeners = new Set();
      this.listeners.set(event, eventListeners);
    }
    eventListeners.add(listener as EventListener<EventName>);

    return () => {
      this.off(event, listener);
    };
  }

  /**
   * Subscribe to an event for a single emission.
   *
   * @param event - Event name to subscribe to
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  once<T extends EventName>(event: T, listener: EventListener<T>): Unsubscribe {
    const wrappedListener: EventListener<T> = (data) => {
      this.off(event, wrappedListener);
      listener(data);
    };
    return this.on(event, wrappedListener);
  }

  /**
   * Unsubscribe from an event.
   *
   * @param event - Event name to unsubscribe from
   * @param listener - Callback function to remove
   */
  off<T extends EventName>(event: T, listener: EventListener<T>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners !== undefined) {
      eventListeners.delete(listener as EventListener<EventName>);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event.
   *
   * @param event - Event name to emit
   * @param data - Event data
   */
  emit<T extends EventName>(event: T, data: EventMap[T]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners !== undefined) {
      for (const listener of eventListeners) {
        try {
          listener(data);
        } catch (error) {
          // Log but don't throw to prevent one listener from breaking others
          // eslint-disable-next-line no-console
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Remove all listeners for an event or all events.
   *
   * @param event - Optional event name. If not provided, removes all listeners.
   */
  removeAllListeners(event?: EventName): void {
    if (event !== undefined) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event.
   *
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount(event: EventName): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

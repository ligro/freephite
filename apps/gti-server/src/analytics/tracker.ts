import type { TrackErrorName, TrackEventName } from "./eventNames";
import type { TrackData, TrackDataWithEventName, TrackResult } from "./types";

import { randomId } from "@withgraphite/gti-shared/utils";

type SendData<T> = (data: TrackDataWithEventName, context: T) => void;

/**
 * Handles analytics tracking for both the server and client sides.
 * Each instance provides a callback to define how to send data for logging.
 *  - The client sends a message to the server to further process
 *  - The server sends the data to finally get processed
 */
export class Tracker<T> {
  constructor(private sendData: SendData<T>, public context: T) {}

  /**
   * Record an analytics error event `eventName`.
   * Like `track`, but also fills out `errorName` and `errorMessage`.
   */
  error(
    eventName: TrackEventName,
    errorName: TrackErrorName,
    error: Error | string | undefined,
    data?: TrackData
  ): void {
    const errorMessage =
      error instanceof Error ? error.message || String(error) : error;
    return this.track(eventName, { ...(data ?? {}), errorMessage, errorName });
  }

  /**
   * Wrap a function with `track()`.
   * If the function throws (or rejects for async), the error is tracked.
   * The execution time is measured and included in the `duration` field.
   */
  operation<T>(
    eventName: TrackEventName,
    errorName: TrackErrorName,
    data: TrackData | undefined,
    operation: (parent: TrackResult) => T
  ): T {
    const startTime = Date.now();
    const id = data?.id ?? randomId();
    try {
      const result = operation({ parentId: id });
      if (isPromise(result)) {
        return result
          .then((finalResult) => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            this.track(eventName, { ...(data ?? {}), duration, id });
            return finalResult;
          })
          .catch((err) => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            this.error(eventName, errorName, err, {
              ...(data ?? {}),
              duration,
              id,
            });
            return Promise.reject(err);
          }) as unknown as T;
      } else {
        const endTime = Date.now();
        const duration = endTime - startTime;
        this.track(eventName, { ...(data ?? {}), duration, id });
        return result;
      }
    } catch (err) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.error(eventName, errorName, err as Error | string, {
        ...(data ?? {}),
        duration,
        id,
      });
      throw err;
    }
  }

  /**
   * Track an event, then return a child `Tracker` that correlates future track calls via the `parentId` field.
   * This way, you can recover the relationship of a tree of events.
   */
  public trackAsParent(
    eventName: TrackEventName,
    data?: TrackData
  ): Tracker<{ parentId: string }> {
    const id = data?.id ?? randomId();
    this.trackData({ ...data, eventName, id });
    const childTracker = new Tracker(
      (childData, ctx) => this.trackData({ ...childData, ...ctx }),
      {
        parentId: id,
      }
    );
    return childTracker;
  }

  /**
   * Record an analytics event `eventName`.
   * Optionally provide additional fields, like arbitrary JSON `extras`.
   */
  public track(eventName: TrackEventName, data?: TrackData): void {
    return this.trackData({ ...data, eventName });
  }

  /**
   * Record analytics event with filled in data struct.
   * `track()` is an easier to use wrapper around this function.
   */
  public trackData(data: TrackDataWithEventName): void {
    const id = data?.id ?? randomId();
    const timestamp = data?.timestamp ?? Date.now();
    const trackData: TrackDataWithEventName = {
      timestamp,
      id,
      ...(data ?? {}),
    };
    this.sendData(trackData, this.context);
  }
}

function isPromise<T>(o: unknown): o is Promise<T> {
  return typeof (o as { then?: () => void })?.then === "function";
}
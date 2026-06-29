import { context } from '@hire1percent/shared';

const contextStore = {
  run(ctx, callback) {
    return context.createContext(ctx, callback);
  },
  getContext() {
    return context.getContext();
  },
  getRequestId() {
    const ctx = this.getContext();
    return ctx?.requestId || null;
  },
  getCorrelationId() {
    const ctx = this.getContext();
    return ctx?.correlationId || null;
  },
  getUser() {
    const ctx = this.getContext();
    return ctx?.user || null;
  },
};

export default contextStore;

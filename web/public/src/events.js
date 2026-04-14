const listeners = {};

export const emitter = {
  on(event, cb) {
    (listeners[event] ??= []).push(cb);
  },
  off(event, cb) {
    listeners[event] = (listeners[event] ?? []).filter(l => l !== cb);
  },
  emit(event, data) {
    (listeners[event] ?? []).forEach(l => l(data));
  },
};

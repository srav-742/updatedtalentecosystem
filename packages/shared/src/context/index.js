import { AsyncLocalStorage } from 'node:async_hooks';

const asyncLocalStorage = new AsyncLocalStorage();

export function createContext(initialData = {}, callback) {
  const wrapper = { value: initialData };
  if (typeof callback === 'function') {
    return asyncLocalStorage.run(wrapper, callback);
  }
  return initialData;
}

export function getContext() {
  const wrapper = asyncLocalStorage.getStore();
  return wrapper ? wrapper.value : undefined;
}

export function setContext(key, value) {
  const wrapper = asyncLocalStorage.getStore();
  if (wrapper && wrapper.value) {
    if (typeof key === 'string') {
      wrapper.value[key] = value;
    } else if (typeof key === 'object' && key !== null) {
      Object.assign(wrapper.value, key);
    }
  }
  return wrapper ? wrapper.value : undefined;
}

export function clearContext() {
  const wrapper = asyncLocalStorage.getStore();
  if (wrapper) {
    wrapper.value = {};
  }
  return wrapper ? wrapper.value : undefined;
}

export function freezeContext() {
  const wrapper = asyncLocalStorage.getStore();
  if (wrapper && wrapper.value) {
    const deepFreeze = (obj) => {
      if (obj && typeof obj === 'object') {
        Object.freeze(obj);
        Object.getOwnPropertyNames(obj).forEach((prop) => {
          deepFreeze(obj[prop]);
        });
      }
    };
    deepFreeze(wrapper.value);
  }
  return wrapper ? wrapper.value : undefined;
}

export default {
  createContext,
  getContext,
  setContext,
  clearContext,
  freezeContext,
};

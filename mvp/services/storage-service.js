(function () {
  if (!window.WAAP) window.WAAP = {};
  if (!window.WAAP.services) window.WAAP.services = {};

  if (window.WAAP.services.storageService) return;

  function safeGet(area, keys) {
    return new Promise((resolve) => {
      try {
        const storage = chrome && chrome.storage ? chrome.storage[area] : null;
        if (!storage || !storage.get) return resolve({});
        storage.get(keys, (data) => resolve(data || {}));
      } catch (e) {
        resolve({});
      }
    });
  }

  function safeSet(area, obj) {
    return new Promise((resolve) => {
      try {
        const storage = chrome && chrome.storage ? chrome.storage[area] : null;
        if (!storage || !storage.set) return resolve();
        storage.set(obj || {}, () => resolve());
      } catch (e) {
        resolve();
      }
    });
  }

  window.WAAP.services.storageService = {
    getSync(keys) {
      return safeGet('sync', keys);
    },
    setSync(obj) {
      return safeSet('sync', obj);
    },
    getLocal(keys) {
      return safeGet('local', keys);
    },
    setLocal(obj) {
      return safeSet('local', obj);
    }
  };
})();

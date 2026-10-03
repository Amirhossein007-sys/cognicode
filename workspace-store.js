/* Full sessions and drafts. IndexedDB owns large data; native mirrors drafts. */
'use strict';
window.WorkspaceStore = (() => {
  let database;
  const ready = new Promise((resolve, reject) => {
    const request = indexedDB.open('cognicode.workspace.v1', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('sessions', { keyPath: 'id' });
      db.createObjectStore('drafts', { keyPath: 'id' });
    };
    request.onsuccess = () => { database = request.result; resolve(database); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('بستن پنجره‌های قدیمی برنامه برای ذخیره لازم است'));
  });
  // Consumers always receive failures; never claim a failed save succeeded.
  ready.catch(() => {});
  async function transaction(store, mode, run) {
    const db = await ready;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      let result;
      try { result = run(tx.objectStore(store)); } catch (e) { reject(e); return; }
      tx.oncomplete = () => resolve(result && result.result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('ذخیره انجام نشد'));
    });
  }
  return {
    ready,
    saveDraft: value => transaction('drafts', 'readwrite', s => s.put({ ...value, id: 'current' })),
    getDraft: () => transaction('drafts', 'readonly', s => s.get('current')),
    put: value => transaction('sessions', 'readwrite', s => s.put(value)),
    list: () => transaction('sessions', 'readonly', s => s.getAll()),
    remove: id => transaction('sessions', 'readwrite', s => s.delete(id)),
    clear: () => transaction('sessions', 'readwrite', s => s.clear())
  };
})();

import { STORE } from './board.js';
import { decodeStudio, emptyStudio, newStudio } from './progress.js';

// Each tab remembers the journal revision it saw on opening. Chrome can grant
// an origin lock before another renderer sees the new localStorage value.
function browserWriter() {
  let db, revision;
  function transaction(mode, operation) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('writers', mode);
      const writers = tx.objectStore('writers');
      let result, failure;
      const abort = error => { failure = error; tx.abort(); };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || tx.error);
      const read = writers.get(0);
      read.onsuccess = () => {
        try { result = operation(read.result, writers, abort); }
        catch (error) { abort(error); }
      };
    });
  }
  function connect() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(STORE + '.lock', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('writers');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        db.onversionchange = () => db.close();
        resolve();
      };
    }).then(() => transaction('readonly', record => { revision = record?.revision || 0; }));
  }
  // Start observing before the first user action. A denied open can be retried.
  let ready = connect().catch(() => false);
  return async prepare => {
    if (await ready === false) {
      ready = connect().catch(() => false);
      if (await ready === false) throw new Error('Storage unavailable');
    }
    return transaction('readwrite', (record, writers, abort) => {
      const current = record?.revision || 0;
      const plan = prepare(current !== revision ? record?.raw : undefined);
      revision = current;
      if (!plan.write) return plan;
      const next = current + 1;
      const put = writers.put({revision: next, raw: plan.raw}, 0);
      put.onsuccess = () => {
        try { plan.write(); revision = next; }
        catch (error) { abort(error); }
      };
      return plan;
    });
  };
}

export function openProgress(getStorage = () => localStorage, lock) {
  let state = emptyStudio(), raw, invalid = false, externalVersion = 0;
  function read(latest) {
    externalVersion++;
    raw = latest;
    try {
      state = latest === null ? newStudio() : decodeStudio(latest);
      invalid = false;
      return true;
    } catch {
      state = emptyStudio();
      invalid = true;
      return false;
    }
  }
  function refresh() {
    try {
      const latest = getStorage().getItem(STORE);
      if (latest === raw) return invalid ? 'invalid' : 'unchanged';
      return read(latest) ? 'changed' : 'invalid';
    } catch {
      return 'unavailable';
    }
  }
  const initial = refresh();
  const serialize = lock ? prepare => lock(() => {
    const plan = prepare();
    plan.write?.();
    return plan;
  }) : browserWriter();
  return {
    initial,
    get state() { return state; },
    get raw() { return raw; },
    get recovery() { return invalid ? 'invalid' : raw === undefined ? 'unavailable' : null; },
    refresh,
    async commit(change, replacement, mergeLocal = false) {
      const expected = raw;
      const version = externalVersion;
      try {
        const outcome = await serialize(committed => {
          const storage = getStorage();
          const latest = committed ?? storage.getItem(STORE);
          if (latest !== raw || version !== externalVersion || !mergeLocal && expected !== raw) {
            if (latest !== raw || raw === undefined) read(latest);
            return {status: invalid ? 'invalid' : 'conflict'};
          }
          if (invalid && !replacement) return {status: 'invalid'};
          const draft = structuredClone(replacement || state);
          const result = change?.(draft);
          const next = JSON.stringify(draft);
          if (next === raw) return {status: 'saved', result};
          return {
            status: 'saved', result, raw: next,
            write() {
              storage.setItem(STORE, next);
              state = draft;
              raw = next;
              invalid = false;
            }
          };
        });
        return {status: outcome.status, result: outcome.result};
      } catch {
        return {status: 'unavailable'};
      }
    }
  };
}

/* Observable Reactive Micro-Store & Event Bus for Rep Gym Companion.
   Provides granular slice subscriptions, reactive state tracking, and decoupled pub/sub events. */

(function(){
  class ReactiveStore {
    constructor(initialState = {}, options = {}){
      this._state = { ...initialState };
      this._listeners = new Map();
      this._eventListeners = new Map();
      this._onPersist = options.onPersist || null;
      this._persistDebounceTimer = null;
    }

    get state(){
      return this._state;
    }

    get(key){
      return this._state[key];
    }

    set(key, value, silent = false){
      const prev = this._state[key];
      if(prev === value) return;
      this._state[key] = value;
      if(!silent){
        this._notify(key, value, prev);
      }
      this.persistDebounced();
    }

    update(patch, silent = false){
      if(!patch || typeof patch !== "object") return;
      const changes = [];
      for(const [key, value] of Object.entries(patch)){
        const prev = this._state[key];
        if(prev !== value){
          this._state[key] = value;
          changes.push({ key, value, prev });
        }
      }
      if(!silent){
        changes.forEach(({ key, value, prev }) => this._notify(key, value, prev));
      }
      this.persistDebounced();
    }

    subscribe(key, listener){
      if(!this._listeners.has(key)){
        this._listeners.set(key, new Set());
      }
      this._listeners.get(key).add(listener);
      return () => {
        const set = this._listeners.get(key);
        if(set) set.delete(listener);
      };
    }

    _notify(key, value, prev){
      const set = this._listeners.get(key);
      if(set){
        set.forEach(listener => {
          try { listener(value, prev, key); } catch(err){ console.error("Store listener error:", err); }
        });
      }
      // Also notify wildcard listeners
      const all = this._listeners.get("*");
      if(all){
        all.forEach(listener => {
          try { listener(key, value, prev); } catch(err){ console.error("Wildcard listener error:", err); }
        });
      }
    }

    on(event, handler){
      if(!this._eventListeners.has(event)){
        this._eventListeners.set(event, new Set());
      }
      this._eventListeners.get(event).add(handler);
      return () => {
        const set = this._eventListeners.get(event);
        if(set) set.delete(handler);
      };
    }

    emit(event, data){
      const handlers = this._eventListeners.get(event);
      if(handlers){
        handlers.forEach(handler => {
          try { handler(data, event); } catch(err){ console.error("Event handler error:", err); }
        });
      }
    }

    persistDebounced(ms = 300){
      if(this._persistDebounceTimer) clearTimeout(this._persistDebounceTimer);
      this._persistDebounceTimer = setTimeout(() => {
        if(typeof this._onPersist === "function"){
          this._onPersist(this._state);
        }
      }, ms);
    }
  }

  function createStore(initialState, options){
    return new ReactiveStore(initialState, options);
  }

  const engine = {
    ReactiveStore,
    createStore
  };

  if(typeof window !== "undefined"){
    window.REP_STORE_ENGINE = engine;
  }
  if(typeof globalThis !== "undefined"){
    globalThis.REP_STORE_ENGINE = engine;
  }
})();

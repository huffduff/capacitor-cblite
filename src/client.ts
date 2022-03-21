import { createNanoEvents } from 'nanoevents';
import type { Unsubscribe } from 'nanoevents';

import { Capacitor, registerPlugin } from '@capacitor/core';

import type {
  Callback,
  CBLitePlugin,
  ChangeEvent,
  DatabaseRecord,
  IndexResult,
  QueryOptions,
  QueryResult,
  ReplEvent,
  Listener,
} from './definitions';

export const CBLite = registerPlugin<CBLitePlugin>('CBLite', {
  web: () => import('./web').then((m) => new m.CBLiteWeb()),
});

// FIXME rxjs Subject may be a better fit for events, escpecially if liveQuery is implemented

// FIXME typescript methods shold use the exact same as the upstream types,
// but with Typescript's Omit(T, name)

export enum Event {
  Change = 'change',
  Busy = 'sync:busy',
  Stopped = 'sync:stopped',
  Idle = 'sync:idle',
  Offline = 'sync:offline',
  Unauthorized = 'sync:unauthorized',
  Error = 'sync:error',
}

export class Client {
  public static prefix = 'cblite';

  public readonly username: string;

  public readonly name: string;

  public cookie = '';

  private events = createNanoEvents();

  private listeners: Record<string, Listener> = {};

  //   public static get isNative() {
  //     return Capacitor.isNative || false;
  //   }

  public replication = {
    active: false,
    pct: 100,
  };

  public static async registerScript(label: string, script: Callback<any>): Promise<void> {
    // FIXME serialize only if not web
    return CBLite.registerScript({
      label,
      script: Capacitor.isNativePlatform() ? script.toString() : script,
    });
  }

  constructor(username: string) {
    this.username = username;
    this.name = `${Client.prefix}-${username.replace(/\./g, '-').toLowerCase()}`;
  }

  public get sessionId(): string {
    const parsed = this.cookie.match(/[A-Za-z099]+=([^;]+);/);
    return parsed?.[1] ? parsed[1] : '';
  }

  public async open(): Promise<void> {
    const { name } = this;
    // FIXME there are better ways.
    // register for change events
    // FIXME add change event support for web (pouchdb) version
    // FIXME unregister event when database is cancelled?
    this.listeners.change = await CBLite.addListener('cblite:change', (e: ChangeEvent) => {
      console.log({ info: e });
      if (e.name === this.name) {
        console.log('CBLITE:change', e);
        this.events.emit('change', e.doc);
      }
    });
    return CBLite.open({ name });
  }

  public async close(): Promise<void> {
    const { name } = this;
    await CBLite.close({ name });
    await this.listeners.change.remove();
    delete this.listeners.change;
  }

  public on<T = unknown>(event: Event, callback: (info: T) => void): Unsubscribe {
    return this.events.on(event, callback);
  }

  public unsubscribe(match: string | RegExp): void {
    const keys = Object.keys(this.events.events);
    keys.forEach((key) => {
      if (key.search(match) !== -1) {
        delete this.events.events[key];
      }
    });
  }

  // should return an event emitter
  public async sync(host: string): Promise<void> {
    const { name, sessionId } = this;
    this.listeners.repl = await CBLite.addListener('cblite:repl', (info: ReplEvent) => {
      console.log({ info });
      if (info.name !== this.name) {
        return;
      }

      this.events.emit(`repl:${info.event}`, info);
      // handle some events directly
      console.log(`CBLITE:repl:${info.event}`);
      switch (info.event) {
        case 'busy':
          this.replication.active = true;
          this.replication.pct = info.total > 0 ? info.completed / info.total : 1;
          break;
        case 'stopped':
        case 'idle':
        case 'offline':
        case 'unauthorized':
          this.replication.active = false;
          this.replication.pct = 1;
          break;
        case 'error':
          break;
        default:
          // ignore
      }
    });

    return CBLite.sync({ name, host, sessionId });
  }

  public async stopSync(): Promise<void> {
    const { name } = this;
    try {
      await CBLite.stopSync({ name });
      await this.listeners.repl.remove();
      delete this.listeners.repl;
    } catch (err) {
      console.log(`error stopping sync: ${err}`);
    }
  }

  public async destroy(): Promise<void> {
    const { name } = this;
    return CBLite.destroy({ name });
  }

  public async get<T = DatabaseRecord>(_id: string, _rev?: string): Promise<T> {
    const { name } = this;
    // FIXME this used to work
    // return CouchbaseLite.get<T>({ name, _id, _rev });
    return CBLite.get({ name, _id, _rev });
  }

  public async put<T = any>(doc: DatabaseRecord & T): Promise<DatabaseRecord> {
    const { name } = this;
    return CBLite.put({ name, doc });
  }

  public async remove(_id: string, _rev: string): Promise<void> {
    const { name } = this;
    return CBLite.remove({ name, _id, _rev });
  }

  public async indexes(): Promise<string[]> {
    const { name } = this;
    const { indexes } = await CBLite.indexes({ name });
    return indexes;
  }

  // TODO support naming it? or rely on autonaming feature?
  public async createIndex(fields: string[]): Promise<IndexResult> {
    const { name } = this;
    return CBLite.createIndex({ name, index: { fields } });
  }

  public async query<T>({ query, callback }: QueryOptions<T>): Promise<QueryResult<T>> {
    const { name } = this;
    const start = Date.now();
    // FIXME stringify if not web?
    // const prepped = JSON.stringify(query);
    // const callback = reducer ? JSON.stringify(reducer) : undefined;
    // const res = (await Core.CBLite.query({ name, query: prepped, callback })) as QueryResult<T>;
    const res = (await CBLite.query({ name, query, callback })) as QueryResult<T>;
    res.totalTime = (Date.now() - start) / 1000;
    return res;
  }

//   public async find<T, Pre = never>(options: FindOptions<Pre, T>): Promise<QueryResult<T>> {
//     const { name } = this;
//     // const query = JSON.stringify(json);
//     // const callback = reducer ? JSON.stringify(reducer) : undefined;
//     const start = Date.now();
//     const res = (await Core.CBLite.find({ ...options, name })) as QueryResult<T>;
//     res.totalTime = (Date.now() - start) / 1000;
//     return res;
//   }
}

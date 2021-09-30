import { createNanoEvents } from 'nanoevents';
import type { Unsubscribe } from 'nanoevents';
import * as Core from '..';

// FIXME rxjs Subject may be a better fit for events, escpecially if liveQuery is implemented

// FIXME typescript methods shold use the exact same as the upstream types,
// but with Typescript's Omit(T, name)

export * from '../definitions';
export class CBLite {
  public static prefix = 'cblite';

  public readonly username: string;

  public readonly name: string;

  public cookie = '';

  private events = createNanoEvents();

  //   public static get isNative() {
  //     return Capacitor.isNative || false;
  //   }

  public replication = {
    active: false,
    pct: 100,
  };

  public static async registerScript(label: string, script: Core.Callback<any>): Promise<void> {
    // FIXME serialize only if not web
    return Core.CBLite.registerScript({ label, script: JSON.stringify(script) });
  }

  constructor(username: string) {
    this.username = username;
    this.name = `${CBLite.prefix}-${username.replace(/\./g, '-').toLowerCase()}`;

    // FIXME there are better ways.
    // register for change events
    // FIXME add change event support for web (pouchdb) version
    // FIXME unregister event when database is cancelled?
    Core.CBLite.addListener('cblite:change', ({ name, doc }: Core.ChangeEvent) => {
      if (name === this.name) {
        this.events.emit('change', doc);
      }
    });
  }

  public get sessionId(): string {
    const parsed = this.cookie.match(/[A-Za-z099]+=([^;]+);/);
    return parsed?.[1] ? parsed[1] : '';
  }

  public async open(): Promise<void> {
    const { name } = this;
    return Core.CBLite.open({ name });
  }

  public on<T = unknown>(event: string, callback: (info: T) => void): Unsubscribe {
    return this.events.on(event, callback);
  }

  // should return an event emitter
  public async sync(host: string): Promise<void> {
    const { name, sessionId } = this;
    Core.CBLite.addListener('cblite:repl', (info: Core.ReplEvent) => {
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

    return Core.CBLite.sync({ name, host, sessionId });
  }

  public async stopSync(): Promise<void> {
    const { name } = this;
    return Core.CBLite.stopSync({ name });
  }

  public async destroy(): Promise<void> {
    const { name } = this;
    return Core.CBLite.destroy({ name });
  }

  public async get<T = Core.DatabaseRecord>(_id: string, _rev?: string): Promise<T> {
    const { name } = this;
    // FIXME this used to work
    // return CouchbaseLite.get<T>({ name, _id, _rev });
    return Core.CBLite.get({ name, _id, _rev });
  }

  public async put(doc: Core.DatabaseRecord): Promise<Core.DatabaseRecord> {
    const { name } = this;
    return Core.CBLite.put({ name, doc });
  }

  public async remove(_id: string, _rev: string): Promise<void> {
    const { name } = this;
    return Core.CBLite.remove({ name, _id, _rev });
  }

  public async indexes(): Promise<string[]> {
    const { name } = this;
    const { indexes } = await Core.CBLite.indexes({ name });
    return indexes;
  }

  // TODO support naming it? or rely on autonaming feature?
  public async createIndex(fields: string[]): Promise<Core.IndexResult> {
    const { name } = this;
    return Core.CBLite.createIndex({ name, index: { fields } });
  }

  public async query<T>({ query, callback }: Core.QueryOptions<T>): Promise<Core.QueryResult<T>> {
    const { name } = this;
    const start = Date.now();
    // FIXME stringify if not web?
    // const prepped = JSON.stringify(query);
    // const callback = reducer ? JSON.stringify(reducer) : undefined;
    // const res = (await Core.CBLite.query({ name, query: prepped, callback })) as QueryResult<T>;
    const res = (await Core.CBLite.query({ name, query, callback })) as Core.QueryResult<T>;
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

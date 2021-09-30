/* eslint-disable import/prefer-default-export */
import { WebPlugin } from '@capacitor/core';

import Database from './database';
import JavascriptContext from './javascriptContext';

import type {
  CallOptions,
  CBLitePlugin,
  DatabaseRecord,
  IndexRequest,
  IndexResult,
  QueryOptions,
  QueryResult,
  ReplicationOptions,
  Callback,
} from './definitions';

const js = new JavascriptContext();

export class CBLiteWeb extends WebPlugin implements CBLitePlugin {
  protected dbs: Record<string, Database> = {};

  protected _db(name: string): Database {
    if (!this.dbs[name]) {
      const local = new Database(name);
      local.watchChanges(this.notifyListeners);
      this.dbs[name] = local;
    }
    return this.dbs[name];
  }

  async open({ name }: CallOptions): Promise<void> {
    this._db(name);
  }

  async sync({ name, host, sessionId }: ReplicationOptions): Promise<void> {
    if (!host || !sessionId) {
      throw new Error('host and Session ID required');
    }

    const db = this._db(name);
    db.setRemote(host).setSession(sessionId).start(this.notifyListeners);
  }

  async updateSessionID({
    name,
    sessionId,
  }: Omit<ReplicationOptions, 'host'>): Promise<void> {
    if (!sessionId) {
      throw new Error('Session ID required');
    }

    const db = this._db(name);
    if (!db.replicator) {
      throw new Error('Replicator not available');
    }
    db.replicator.setSession(sessionId);
  }

  async stopSync({ name }: CallOptions): Promise<void> {
    const db = this._db(name);
    db.replicator?.stop();
  }

  async destroy({ name }: CallOptions): Promise<void> {
    const db = this._db(name);
    db.delete();
  }

  async get<T>({
    name,
    _id,
  }: CallOptions & DatabaseRecord): Promise<DatabaseRecord & T> {
    if (!_id) {
      throw new Error('_id field required');
    }

    const db = this._db(name);
    return db.get<T>(_id);
  }

  async put<T>({
    name,
    doc,
  }: CallOptions & { doc: T & DatabaseRecord }): Promise<DatabaseRecord> {
    if (!doc) {
      throw new Error('Document data missing');
    }
    if (!doc._id) {
      throw new Error('_id field required');
    }

    const db = this._db(name);
    return db.put<T>(doc);
  }

  async remove({
    name,
    _id,
    _rev,
  }: CallOptions & DatabaseRecord): Promise<void> {
    if (!_id || !_rev) {
      throw new Error('both _id and _rev fields are required');
    }

    const db = this._db(name);
    db.remove(_id, _rev);
  }

  async indexes({ name }: CallOptions): Promise<{ indexes: string[] }> {
    const db = this._db(name);
    const indexes = await db.indexes();
    return { indexes };
  }

  async createIndex({
    name,
    index,
  }: CallOptions & { index: IndexRequest }): Promise<IndexResult> {
    if (!index || !index.fields) {
      throw new Error('Index request missing or malformed');
    }

    const label = index.name || index.fields.join('|');

    const db = this._db(name);
    const created = await db.createIndex(label, index.fields);
    return { result: created ? 'created' : 'exists', name: label };
  }

  async registerScript(opts: {
    label: string;
    script: string | Callback<any>;
  }): Promise<void> {
    const { label, script } = opts;
    if (!label || !script) {
      throw new Error('Problem registering script: values missing.');
    }
    if (typeof script === 'string') {
      throw this.unimplemented('Web only supports registering a callback function at the moment');
    }
    js.registerScript(label, script);
  }

  async query<T = unknown>(options: CallOptions & QueryOptions<T>): Promise<QueryResult<T>> {
    const { query, callback } = options;
    if (!query) {
      return Promise.reject(new Error('Query required'));
    }
    const cb = callback && typeof callback !== 'string'
      ? callback?.toString()
      : callback;
    if (cb) {
      throw this.unimplemented('Callback support not implemented on web... yet.');
    }
    throw this.unimplemented('Not implemented on web... yet.');
  }
}

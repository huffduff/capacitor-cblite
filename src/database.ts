import PouchDB from 'pouchdb-browser';
// import type { ChangesMeta } from 'pouchdb-changes';

import type { DatabaseRecord, Query } from './definitions';
import Replicator from './replicator';

// Database abstract the underlying implementation, in case we decide to change it later
export default class Database {
  public database: PouchDB.Database;

  public replicator?: Replicator;

  private changeListeners: PouchDB.Core.Changes<any>[] = [];

  constructor(name: string) {
    this.database = new PouchDB(name);
  }

  public setRemote(host: string): Replicator {
    if (!this.replicator) {
      this.replicator = new Replicator(this.database, host);
    }
    return this.replicator;
  }

  public watchChanges<T = unknown>(
    call: (event: string, data: DatabaseRecord & T) => void,
  ): void {
    const changes = this.database.changes<DatabaseRecord & T>({
      live: true,
      since: 'now',
      include_docs: true,
    });
    changes.on('change', ({ doc }) => {
      if (doc) {
        call(`cblite:${this.database.name}:change`, doc);
      }
    });
    this.changeListeners.push(changes);
  }

  async get<T>(_id: string, rev?: string): Promise<DatabaseRecord & T> {
    return this.database.get<DatabaseRecord & T>(_id, { rev });
  }

  async put<T>(doc: DatabaseRecord & T): Promise<DatabaseRecord> {
    return this.database
      .put<T>(doc)
      .then(({ id, rev }) => ({ _id: id, _rev: rev }));
  }

  async remove(_id: string, _rev: string): Promise<void> {
    this.database.remove({ _id, _rev });
  }

  async delete(): Promise<void> {
    this.database.destroy();
  }

  async indexes(): Promise<string[]> {
    const { indexes } = await this.database.getIndexes();
    return indexes.map(({ name }) => name);
  }

  async createIndex(name: string, fields: string[]): Promise<boolean> {
    if ((await this.indexes()).includes(name)) {
      return false;
    }
    await this.database.createIndex({ index: { fields, ddoc: 'app', name } });
    return true;
  }

  async query<T>(src: string): Promise<(DatabaseRecord & T)[]>;
  async query<T>(src: Query): Promise<(DatabaseRecord & T)[]>;
  async query<T>(src: any): Promise<(DatabaseRecord & T)[]> {
    if (typeof src === 'string') {
      throw new Error(
        `NQL queries are not supported. db: ${this.database.name}`,
      );
    }
    throw new Error(`Queries not supported yet. db: ${this.database.name}`);
  }
}

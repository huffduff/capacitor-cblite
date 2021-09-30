import PouchDB from 'pouchdb-browser';

export default class Replicator {
  private local: PouchDB.Database;

  private remote: PouchDB.Database;

  private sessionId?: string;

  private replicator?: PouchDB.Replication.Sync<any>;

  constructor(db: PouchDB.Database, host: string) {
    this.local = db;
    this.remote = new PouchDB(`https://${host}`, {
      async fetch(url, opts) {
        let fullUrl = url;
        if ((url as string).includes('/_changes?')) {
          fullUrl += '&update_seq=true';
        }

        return PouchDB.fetch(fullUrl, { ...opts, credentials: 'include' });
      },
    });
  }

  public setSession(sessionId: string): Replicator {
    // }  sessionId: string) {
    this.sessionId = sessionId;
    return this;
  }

  public start(
    call?: (event: string, data: Record<string, unknown>) => void,
  ): void {
    this.replicator = this.local.sync(this.remote, { live: true, retry: true });
    const { name } = this.local;
    if (call) {
      this.replicator
        .on('change', (data) => {
          // TODO handle 'deleted'
          // TODO handle 'revoked'
          // FIXME should this event be skipped and handled by a changeHandler instead?
          call(`cblite:${name}:repl`, { event: 'change', data });
        })
        // TODO figure out what 'connecting' means and if it can be captured here
        // assuming 'paused' and 'idle' are similar
        .on('paused', (data) => call(`cblite:${name}:repl`, { event: 'idle', data }))
        // assuming 'active' and 'busy' are similar
        .on('active', () => call(`cblite:${name}:repl`, { event: 'busy' }))
        // FIXME doesn't exist in cblite. send as an error instead?
        .on('denied', (data) => call(`cblite:${name}:repl`, { event: 'denied', data }))
        .on('complete', (data) => call(`cblite:${name}:repl`, { event: 'complete', data }))
        .on('error', (error) => {
          if ((error as { status: number }).status === 401) {
            console.log(`sessionId: "${this.sessionId}" is invalid or expired`);
            call(`cblite:${name}:repl`, { event: 'unauthorized', error });
          }
          call(`cblite:${name}:repl`, { event: 'error', error });
        });
    }
  }

  public stop(): void {
    this.replicator?.cancel();
    delete this.replicator;
  }
}

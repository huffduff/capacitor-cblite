export interface DatabaseRecord {
  _id: string;
  _rev?: string;
}

export interface IndexRequest {
  fields: string[];
  name?: string;
}

export interface IndexResult {
  result: 'created' | 'exists';
  name: string;
}

export interface ReplEvent {
  name: string;
  completed: number;
  total: number;
  error?: string;
  status?: number;
  event: string;
}

export interface ChangeEvent {
  name: string;
  doc: any;
}

// TODO look into https://github.com/gvergnaud/ts-pattern for query definitions
// and https://github.com/AnyhowStep/efficacious-valley-repair/tree/main/app
// and https://glitch.com/~efficacious-valley-repair
export interface Query {
  what: any[][];
  // from?: any[]; // don't support yet
  where?: any[];
  group_by?: any[];
  order_by?: any[];
  limit?: number;
  offset?: number;
}

export interface QueryResult<T> {
  rows: T[];
  executionTime: number;
  totalTime?: number;
  totalCount: number;
  finalCount: number;
}

export interface CallOptions {
  name: string;
}

export interface ReplicationOptions extends CallOptions {
  host: string;
  sessionId: string;
}

export type Callback<T> = (rows: T[]) => T[];

export interface QueryOptions<T> {
  query: Query | string;
  callback?: string | Callback<T>;
}
export interface CBLitePlugin {
  open(options: CallOptions): Promise<void>;
  sync(options: ReplicationOptions): Promise<void>;
  updateSessionID(options: Omit<ReplicationOptions, 'host'>): Promise<void>;
  stopSync(options: CallOptions): Promise<void>;
  destroy(options: CallOptions): Promise<void>;

  get<T>(options: CallOptions & DatabaseRecord): Promise<DatabaseRecord & T>;
  put<T>(
    options: CallOptions & { doc: DatabaseRecord & T },
  ): Promise<DatabaseRecord>;
  remove(options: CallOptions & DatabaseRecord): Promise<void>;

  indexes(options: CallOptions): Promise<{ indexes: string[] }>;
  createIndex(
    options: CallOptions & { index: IndexRequest },
  ): Promise<IndexResult>;
  registerScript(options: { label: string; script: string }): Promise<void>;
  query<T = unknown>(
    options: CallOptions & QueryOptions<T>,
  ): Promise<QueryResult<T>>;

  addListener(event: 'cblite:repl', listener: (data: ReplEvent) => void): void;
  addListener(event: 'cblite:change', listener: (data: ChangeEvent) => void): void;
}

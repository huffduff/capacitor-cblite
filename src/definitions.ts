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

// TODO tighten up this definition
export interface Query {
  what: any[];
  from?: any[];
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

export interface QueryOptions<Post> {
  query: Query | string;
  callback?: string | ((rows: Post[]) => Post[]);
}
export interface CBLitePlugin {
  open(options: CallOptions): Promise<void>;
  sync(options: ReplicationOptions): Promise<void>;
  updateSessionID(options: Omit<ReplicationOptions, 'host'>): Promise<void>;
  stopSync(options: CallOptions): Promise<void>;
  destroy(options: CallOptions): Promise<void>;
  
  get<T = DatabaseRecord>(options: CallOptions & DatabaseRecord): Promise<T>;
  put<T>(options: CallOptions & { doc: T & DatabaseRecord }): Promise<DatabaseRecord>;
  remove(options: CallOptions & DatabaseRecord): Promise<void>;
  
  indexes(options: CallOptions): Promise<{ indexes: string[] }>;
  createIndex(options: CallOptions & { index: IndexRequest }): Promise<IndexResult>;
  registerScript(options: { label: string; script: string }): Promise<void>;
  query<T = unknown>(options: CallOptions & QueryOptions<T>): Promise<QueryResult<T>>;
}

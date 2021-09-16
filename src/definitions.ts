export interface CBLitePlugin {
  echo(options: { value: string }): Promise<{ value: string }>;
}

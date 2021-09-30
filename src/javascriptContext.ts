import type { Callback } from './definitions';

export default class JavascriptContext {
  private scripts: Record<string, Callback<any>> = {};

  registerScript(label: string, src: Callback<any>): void {
    this.scripts[label] = src;
  }

  queryCallback<T>(script: string, rows: T[]): T[] {
    if (this.scripts[script]) {
      return this.scripts[script](rows);
    }
    throw new Error(
      'String formed callbacks not implemented in web, or script not found.',
    );
    // const func = new Function('rows', `return ${script}(rows)`);
    // return func.call(null, rows) as any[];
  }
}

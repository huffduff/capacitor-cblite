import { WebPlugin } from '@capacitor/core';

import type { CBLitePlugin } from './definitions';

export class CBLiteWeb extends WebPlugin implements CBLitePlugin {
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }
}

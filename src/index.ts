import { registerPlugin } from '@capacitor/core';

import type { CBLitePlugin } from './definitions';

const CBLite = registerPlugin<CBLitePlugin>('CBLite', {
  web: () => import('./web').then((m) => new m.CBLiteWeb()),
});

export * from './definitions';
export { CBLite };

import * as BufferModule from 'buffer';

if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = BufferModule.Buffer;
}
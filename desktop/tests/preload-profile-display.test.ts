import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

for (const filename of ['preload.ts', 'client-preload.ts']) {
  test(`${filename} replays an early profile request and unsubscribes`, () => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const sent: unknown[][] = [];
    const exposed: Record<string, unknown> = {};
    const electron = {
      ipcRenderer: {
        on: (name: string, listener: (...args: unknown[]) => void) => { listeners.set(name, listener); },
        removeListener: () => {},
        send: (...args: unknown[]) => { sent.push(args); },
        invoke: async () => {},
      },
      contextBridge: { exposeInMainWorld: (name: string, value: unknown) => { exposed[name] = value; } },
    };
    const source = readFileSync(join(__dirname, '..', 'src', filename), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(code, { require: (name: string) => { if (name === 'electron') return electron; throw new Error(name); }, exports: {}, process: { isMainFrame: true, argv: [], platform: 'linux' }, location: { protocol: 'about:' }, navigator: { languages: ['fr-FR', 'zh-CN'] } });
    const client = exposed.onwDesktopClient as { onRequestProfileDisplay(listener: () => void): () => void; setProfileDisplay(locale: string, format: string | null): void };
    const request = listeners.get('desktop-client:request-profile-display')!;
    request();
    assert.equal(JSON.stringify(sent[0]), JSON.stringify(['desktop-client:browser-languages', ['fr-FR', 'zh-CN']]));
    let calls = 0;
    const unsubscribe = client.onRequestProfileDisplay(() => { calls++; });
    assert.equal(calls, 1);
    request();
    assert.equal(calls, 2);
    unsubscribe();
    request();
    assert.equal(calls, 2);
    client.onRequestProfileDisplay(() => { calls++; });
    assert.equal(calls, 3);
    client.setProfileDisplay('zh-CN', 'dmy');
    assert.deepEqual(sent.at(-1), ['desktop-client:profile-display', 'zh-CN', 'dmy']);
  });
}

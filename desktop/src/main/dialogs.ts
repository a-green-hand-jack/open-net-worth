import { BrowserWindow, dialog } from 'electron';
import { Readable } from 'node:stream';
import type { ImportSelection } from '../contracts';
import { BackendSupervisor } from './backend';
import { FILE_EXTENSIONS, readSelectedFiles } from './files';
import { atomicExport } from './exports';
import { message as t } from './native-messages';

export async function chooseImportFiles(window: BrowserWindow): Promise<ImportSelection> {
  const result = await dialog.showOpenDialog(window, { title: t('Import a statement or receipt'), properties: ['openFile', 'multiSelections'], filters: [{ name: t('Statements and documents'), extensions: FILE_EXTENSIONS }] });
  return { cancelled: result.canceled, files: result.canceled ? [] : await readSelectedFiles(result.filePaths) };
}

export async function saveExport(window: BrowserWindow, backend: BackendSupervisor): Promise<{ cancelled: boolean }> {
  const chosen = await dialog.showSaveDialog(window, { title: t('Export your Open Net Worth book'), defaultPath: `open-net-worth-export-${new Date().toISOString().slice(0, 10)}.zip`, filters: [{ name: t('Book export'), extensions: ['zip'] }] });
  if (chosen.canceled || !chosen.filePath) return { cancelled: true };
  const response = await backend.request('/api/data/export', { signal: AbortSignal.timeout(120_000) });
  if (!response.body) throw new Error(t('The export could not be downloaded.'));
  await atomicExport(chosen.filePath, Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), backend.bookRoot);
  return { cancelled: false };
}

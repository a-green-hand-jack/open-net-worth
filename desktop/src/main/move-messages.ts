import { getDesktopLocale } from './desktop-locale';
import { message } from './native-messages';

export const moveMessages: Record<string, { text: string; parameter?: string }> = {
  'move.too_large': { text: 'This book is larger than the free space on the destination.', parameter: 'max_size' },
  'move.unknown': { text: 'unknown move' },
  'move.size_invalid': { text: 'size must be a positive number of bytes' },
  'move.digest_invalid': { text: 'sha256 must be a 64-character hex digest' },
  'move.rate_limited': { text: 'too many moves started; try again in {retry_seconds} seconds', parameter: 'retry_seconds' },
  'move.already_in_progress': { text: 'another move is already in progress on this server' },
  'move.parts_closed': { text: 'this move is no longer accepting parts' },
  'move.part_out_of_range': { text: 'part number out of range' },
  'move.part_digest_invalid': { text: 'X-Part-Sha256 must be a 64-character hex digest' },
  'move.part_too_large': { text: 'part is larger than expected' },
  'move.part_too_short': { text: 'part is shorter than expected' },
  'move.part_checksum_mismatch': { text: 'part checksum does not match' },
  'move.already_committed': { text: 'this move was already committed' },
  'move.parts_missing': { text: '{missing_parts} parts have not arrived yet', parameter: 'missing_parts' },
  'move.book_not_empty': { text: 'This server already has a book. Moving replaces it; confirm to continue.' },
  'move.import_before_secrets': { text: 'the book must finish importing before secrets can be applied' },
  'move.import_before_finish': { text: 'the book must finish importing before the move can finish' },
  'move.import_cannot_cancel': { text: 'the import is running and cannot be cancelled' },
  'move.part_exceeds_size': { text: 'part is larger than the part size' },
  'move.upload_storage_failed': { text: 'the server could not store the upload (disk full?)' },
  'move.secrets_too_large': { text: 'secrets payload too large' },
  'move.secrets_json_invalid': { text: 'secrets payload must be JSON' },
  'move.old_format': { text: 'This move was sent by an older version of the app. Update both copies of the app to the same version, then move again.' },
  'move.connector_unknown': { text: 'unknown connector in the secrets payload' },
  'move.secrets_object_required': { text: 'secrets payload must be an object' },
  'move.secrets_shape_invalid': { text: 'secrets payload has the wrong shape' },
  'move.mcp_limit': { text: 'too many MCP servers' },
  'move.import_checksum_mismatch': { text: 'The uploaded book did not match its checksum. Start the move again.' },
  'move.import_failed': { text: 'The import did not finish. Check the server and try again.' },
  'move.import_interrupted': { text: 'The import was interrupted. Start the move again.' },
};

export function moveMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { message_id: id, message_params: params } = body as Record<string, unknown>;
  if (typeof id !== 'string' || !Object.hasOwn(moveMessages, id)) return null;
  const entry = moveMessages[id]!;
  if (!params || typeof params !== 'object' || Array.isArray(params)) return null;
  const values = params as Record<string, unknown>;
  const keys = Object.keys(values);
  if (!entry.parameter) return keys.length === 0 ? message(entry.text) : null;
  const value = values[entry.parameter];
  if (keys.length !== 1 || keys[0] !== entry.parameter || typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return null;
  return entry.text.includes(`{${entry.parameter}}`) ? message(entry.text, getDesktopLocale(), { [entry.parameter]: value }) : message(entry.text);
}

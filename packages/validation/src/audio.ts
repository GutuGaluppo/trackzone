/**
 * Allow-list of audio the platform accepts.
 *
 * The browser-supplied MIME type is a hint, never proof: the extension and the
 * declared type must agree here, and the worker verifies the audio content
 * before a file is marked `ready`.
 */
export const ALLOWED_AUDIO_TYPES = {
  'audio/wav': ['wav'],
  'audio/x-wav': ['wav'],
  'audio/wave': ['wav'],
  'audio/vnd.wave': ['wav'],
  'audio/aiff': ['aif', 'aiff'],
  'audio/x-aiff': ['aif', 'aiff'],
  'audio/flac': ['flac'],
  'audio/x-flac': ['flac'],
  'audio/mpeg': ['mp3'],
  'audio/mp4': ['m4a', 'mp4'],
  'audio/x-m4a': ['m4a'],
  'audio/aac': ['aac'],
  'audio/ogg': ['ogg', 'oga'],
  'audio/opus': ['opus'],
} as const satisfies Record<string, readonly string[]>;

export type AllowedAudioMimeType = keyof typeof ALLOWED_AUDIO_TYPES;

export const ALLOWED_AUDIO_EXTENSIONS: readonly string[] = [
  ...new Set(Object.values(ALLOWED_AUDIO_TYPES).flat()),
];

/** 2 GiB. Lossless masters are large; anything beyond this is not a v0.1 case. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

/** Rejects zero-byte files early rather than after a pointless round trip. */
export const MIN_UPLOAD_BYTES = 1;

export function isAllowedMimeType(value: string): value is AllowedAudioMimeType {
  return value in ALLOWED_AUDIO_TYPES;
}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase();
}

/** File.type can be empty or generic. This is a hint; the worker still verifies bytes. */
export function resolveAudioMimeType(
  filename: string,
  browserType: string,
): AllowedAudioMimeType | null {
  const type = browserType.trim().toLowerCase().split(';')[0]?.trim() ?? '';
  if (isAllowedMimeType(type)) return mimeMatchesExtension(type, filename) ? type : null;
  if (type !== '' && type !== 'application/octet-stream' && type !== 'binary/octet-stream')
    return null;

  const extension = extensionOf(filename);
  for (const [mimeType, extensions] of Object.entries(ALLOWED_AUDIO_TYPES)) {
    if ((extensions as readonly string[]).includes(extension))
      return mimeType as AllowedAudioMimeType;
  }
  return null;
}

/** The declared MIME type and the file extension must describe the same thing. */
export function mimeMatchesExtension(mimeType: string, filename: string): boolean {
  if (!isAllowedMimeType(mimeType)) return false;
  const extensions: readonly string[] = ALLOWED_AUDIO_TYPES[mimeType];
  return extensions.includes(extensionOf(filename));
}

/** C0/C1 control characters, written as escapes so the source stays printable. */
// eslint-disable-next-line no-control-regex -- deliberately stripping control characters from filenames
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F]', 'g');
const UNSAFE_CHARS = new RegExp('[^a-zA-Z0-9._ -]', 'g');

/**
 * Normalizes a user-supplied filename into something safe to store and display.
 * Strips directory components, control characters and anything that could be
 * interpreted as a path by the storage layer.
 */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? '';
  const cleaned = base
    .replace(CONTROL_CHARS, '')
    .replace(UNSAFE_CHARS, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+/, '')
    .trim();

  return cleaned.slice(0, 200) || 'audio';
}

/** Human title derived from a filename, used when no metadata exists yet. */
export function titleFromFilename(filename: string): string {
  const base = sanitizeFilename(filename);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return stem.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled';
}

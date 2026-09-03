/**
 * Formatters for the technical readouts that give the interface its texture
 * (docs §11: DM Mono carries durations, rates and depths).
 */

/** `4:31`, or `1:04:31` past an hour. Never `NaN`. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '--:--';

  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value: number) => String(value).padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Seconds → the same clock format, for the player's live position. */
export function formatSeconds(seconds: number): string {
  return formatDuration(Number.isFinite(seconds) ? seconds * 1000 : null);
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/** `48 kHz` */
export function formatSampleRate(hz: number | null | undefined): string {
  if (!hz) return '—';
  const khz = hz / 1000;
  return `${Number.isInteger(khz) ? khz : khz.toFixed(1)} kHz`;
}

export function formatBitDepth(bits: number | null | undefined): string {
  return bits ? `${bits}-bit` : '—';
}

export function formatBitrate(bps: number | null | undefined): string {
  return bps ? `${Math.round(bps / 1000)} kbps` : '—';
}

export function formatChannels(channels: number | null | undefined): string {
  if (!channels) return '—';
  if (channels === 1) return 'Mono';
  if (channels === 2) return 'Stereo';
  return `${channels} ch`;
}

/** Container/codec shorthand shown in the FORMAT column: `WAV`, `FLAC`, `MP3`. */
export function formatContainer(filename: string | null, codec: string | null): string {
  const fromName = filename?.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toUpperCase();
  return codec ? codec.toUpperCase() : '—';
}

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600_000],
  ['month', 30 * 24 * 3600_000],
  ['day', 24 * 3600_000],
  ['hour', 3600_000],
  ['minute', 60_000],
];

export function formatRelativeDate(iso: string): string {
  const delta = new Date(iso).getTime() - Date.now();
  const absolute = Math.abs(delta);

  for (const [unit, ms] of UNITS) {
    if (absolute >= ms) return RELATIVE.format(Math.round(delta / ms), unit);
  }

  return 'just now';
}

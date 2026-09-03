/** Minimal, valid PCM WAV buffers built by hand — no fixture files, no ffmpeg. */
export function buildTestWav({
  sampleRate = 44_100,
  bitDepth = 16,
  channels = 2,
  durationSeconds = 1,
}: {
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
  durationSeconds?: number;
}): Uint8Array {
  const blockAlign = channels * (bitDepth / 8);
  const byteRate = sampleRate * blockAlign;
  const numSamples = Math.round(sampleRate * durationSeconds);
  const dataSize = numSamples * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i);
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  return bytes;
}

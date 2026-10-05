export function isLocalUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

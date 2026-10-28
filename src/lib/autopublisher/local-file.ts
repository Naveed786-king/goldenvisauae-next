// Reads a picture stored by this site (/uploads/... from the upload store, other /paths from public/).
export async function readLocal(url: string): Promise<Buffer | null> {
  const { readStored } = await import('@/lib/upload');
  if (url.startsWith('/uploads/')) return readStored(url);
  if (url.startsWith('/')) {
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const file = path.resolve(process.cwd(), 'public', `.${url}`);
    if (!file.startsWith(path.resolve(process.cwd(), 'public'))) return null; // no ../ escapes
    return fs.readFile(file).catch(() => null);
  }
  return null;
}

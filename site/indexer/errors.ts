/** A build-time failure that names the offending file (AC-5). The build must exit non-zero on it. */
export class IndexError extends Error {
  readonly file: string;
  readonly reason: string;

  constructor(file: string, reason: string) {
    super(`${file}: ${reason}`);
    this.name = 'IndexError';
    this.file = file;
    this.reason = reason;
  }
}

export class UndecryptableStorageError extends Error {
  readonly code = 'UNDECRYPTABLE' as const;

  constructor(public readonly storageKey: string, cause?: unknown) {
    super(`Cannot decrypt storage key: ${storageKey}`);
    this.name = 'UndecryptableStorageError';
    if (cause instanceof Error) this.cause = cause;
  }
}

export type StorageHealth = 'fresh' | 'ok' | 'locked';

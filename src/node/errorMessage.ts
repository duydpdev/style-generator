/**
 * The human-readable text of a caught value: an `Error`'s `message`, else the
 * value stringified.
 * @param {unknown} error - The value a `catch` block received
 * @returns {string} The message to show or log
 */
export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

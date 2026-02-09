/**
 * Shared route utilities.
 * Common helpers used across multiple route handlers.
 */

import type { ZodError } from "zod";

/**
 * Formats a ZodError into an array of field-level error messages
 * suitable for API responses.
 */
export function formatZodError(err: ZodError) {
  return err.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

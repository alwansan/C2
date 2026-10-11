export class AddonError extends Error {
  constructor(code, message, status = 502, details) {
    super(message); this.name = 'AddonError'; this.code = code; this.status = status; this.details = details;
  }
}
export function assert(condition, code, message, status = 400) {
  if (!condition) throw new AddonError(code, message, status);
}

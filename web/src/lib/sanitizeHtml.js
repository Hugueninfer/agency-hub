import DOMPurify from "dompurify";

/**
 * Sanitiza HTML antes de usar com dangerouslySetInnerHTML (mitiga XSS).
 * Preferir sempre texto simples / React children quando possível.
 *
 * @param {unknown} dirty
 * @returns {string}
 */
export function sanitizeHtml(dirty) {
  if (dirty === null || dirty === undefined) {
    return "";
  }
  return DOMPurify.sanitize(String(dirty), {
    USE_PROFILES: { html: true },
  });
}

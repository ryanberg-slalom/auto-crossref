/**
 * Returns `${count} ${word}` with the word pluralized if count !== 1.
 * @param {number} count
 * @param {string} singular - e.g. "run"
 * @param {string} [plural]  - defaults to singular + "s"
 */
export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

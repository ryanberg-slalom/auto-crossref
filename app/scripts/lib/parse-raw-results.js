/**
 * Parses the RAW results PDF text into structured driver records.
 * Excludes Novice class drivers.
 *
 * RAW format per row (concatenated):
 * {pos}{name}{class}{carNum}{fromPrev}{fromTop}{bestTime}
 *
 * Example: "84Ryan BergFS2-0.414-10.50664.379"
 */

const NOVICE_CLASSES = new Set(['N', 'NOV', 'NOVA', 'NOVB', 'NOVC'])

function isNovice(classCode) {
  if (!classCode) return false
  const c = classCode.toUpperCase().trim()
  if (NOVICE_CLASSES.has(c)) return true
  if (c.startsWith('NOV')) return true
  return false
}

/**
 * @param {string} text - extracted text from the RAW results PDF
 * @returns {Array<{pos, name, class_code, car_number, raw_time}>}
 */
export function parseRawResults(text) {
  const drivers = []

  // Find the header to skip it
  const headerEnd = text.indexOf('From Top')
  const body = headerEnd >= 0 ? text.slice(headerEnd + 8) : text

  // Strategy: find all "bestTime" values — they appear at the END of each row
  // The bestTime is a decimal number preceded by gap values (which are negative or have '-')
  // Pattern: find a positive decimal (the best time) that's preceded by a negative decimal (fromTop)
  // This is more reliable than trying to parse from the start

  // Alternative: find rows by looking for the pattern {class}{carNum}{gaps}{bestTime}
  // We know bestTime is in range [35, 260] and the gap values are negative

  // Simple approach: use class code as anchor
  // Each row: after {name} comes {class}{carNum}{-fromPrev}{-fromTop}{bestTime}
  // Capture: {classCode}{1-3 digits}{gaps}{bestTime}
  const rowRe = /([A-Z]{1,5}(?:\/[A-Z]{1,5})?)(\d{1,3})(-\d+\.\d+)(-\d+\.\d+)(\d{2,3}\.\d{3})/g

  let m
  while ((m = rowRe.exec(body)) !== null) {
    const classCode = m[1]
    const carNum = m[2]
    const rawTime = parseFloat(m[5])

    if (isNovice(classCode)) continue
    if (rawTime < 35 || rawTime > 300) continue

    // Extract name: look backwards from this match to find the name
    const textBefore = body.slice(0, m.index)
    const nameMatch = textBefore.match(/([A-Z][a-zA-Z\s\-\.\,\';]+?)$/)
    const name = nameMatch ? nameMatch[1].trim() : ''

    // Extract position: digits before the name
    const textBeforeName = name
      ? textBefore.slice(0, textBefore.length - nameMatch[0].length)
      : textBefore
    const posMatch = textBeforeName.match(/(\d+)$/)
    const pos = posMatch ? parseInt(posMatch[1], 10) : null

    drivers.push({
      pos,
      name,
      class_code: classCode,
      car_number: carNum,
      raw_time: rawTime,
    })
  }

  return drivers
}

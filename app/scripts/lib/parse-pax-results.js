/**
 * Parses the PAX/Indexed results PDF text into structured driver records.
 * Excludes Novice class (class "N", "NOV*") drivers.
 *
 * Row format in concatenated text (no separators):
 *   {pos}{name}{class}{carNum}{rawTime}{paxIndex}{indexedTime}{gapPrev}{gapTop}
 *
 * Parsing strategy: use the PAX index (0.7xx–0.9xx) as a unique per-row anchor.
 * Work backwards from the PAX index to extract rawTime, class, name, carNum.
 */

function isNovice(classCode) {
  if (!classCode) return true
  const c = classCode.toUpperCase().trim()
  if (c === 'N') return true
  if (c.startsWith('NOV')) return true
  return false
}

/**
 * Given an integer string that is carNum+rawTime_integer concatenated
 * (e.g. "6855" = carNum "68" + rawTimeInt "55"), splits them by finding
 * the rawTime integer whose float value is in the valid range [35, 260].
 *
 * @param {string} intPart - digit string, e.g. "6855"
 * @param {string} frac - fractional part with dot, e.g. ".603"
 * @returns {{ carNum: string, rawTime: number }}
 */
function splitCarNumAndTime(intPart, frac) {
  // Try last 2 digits as rawTime integer (single-course events, ~40-99s)
  if (intPart.length >= 2) {
    const rt = parseFloat(intPart.slice(-2) + frac)
    if (rt >= 35 && rt <= 260) {
      return { carNum: intPart.slice(0, -2), rawTime: rt }
    }
  }
  // Try last 3 digits as rawTime integer (dual-run events, ~70-260s)
  if (intPart.length >= 3) {
    const rt = parseFloat(intPart.slice(-3) + frac)
    if (rt >= 35 && rt <= 260) {
      return { carNum: intPart.slice(0, -3), rawTime: rt }
    }
  }
  // Single digit fallback
  if (intPart.length >= 1) {
    const rt = parseFloat(intPart.slice(-1) + frac)
    if (rt >= 35) {
      return { carNum: intPart.slice(0, -1), rawTime: rt }
    }
  }
  return { carNum: '', rawTime: parseFloat(intPart + frac) }
}

/**
 * Extract the driver name from the text segment that precedes the class code.
 * The name always starts with an uppercase letter and is preceded by digits
 * (the position number and/or gap decimals from the previous row).
 * Strategy: find the last digit in the segment, then take everything after it.
 */
function extractName(textBeforeClass) {
  // Find last digit position
  let lastDigitIdx = -1
  for (let i = textBeforeClass.length - 1; i >= 0; i--) {
    if (textBeforeClass[i] >= '0' && textBeforeClass[i] <= '9') {
      lastDigitIdx = i
      break
    }
  }
  const raw = lastDigitIdx >= 0
    ? textBeforeClass.slice(lastDigitIdx + 1)
    : textBeforeClass
  return raw.trim()
}

/**
 * @param {string} text - full concatenated text from PAX/Indexed results PDF
 * @returns {Array<{name, class_code, car_number, raw_time, pax_index, indexed_time}>}
 */
export function parsePaxResults(text) {
  const drivers = []

  // Find all PAX index anchors: 0.7xx, 0.8xx, 0.9xx
  const paxRe = /0\.[789]\d{2}/g
  let m

  while ((m = paxRe.exec(text)) !== null) {
    const paxStart = m.index
    const paxIdx = parseFloat(m[0])

    // --- Raw time: decimal immediately before the PAX index ---
    const textBeforePax = text.slice(0, paxStart)
    const rawTimeMatch = textBeforePax.match(/(\d+)\.(\d{3})$/)
    if (!rawTimeMatch) continue

    const intPart = rawTimeMatch[1]
    const frac = '.' + rawTimeMatch[2]
    const { carNum, rawTime } = splitCarNumAndTime(intPart, frac)
    if (rawTime < 35 || rawTime > 300) continue

    // --- Indexed time: decimal immediately after the PAX index ---
    const textAfterPax = text.slice(paxStart + 5) // "0.xxx" = 5 chars
    const idxTimeMatch = textAfterPax.match(/^(\d{2,3}\.\d{3})/)
    if (!idxTimeMatch) continue
    const indexedTime = parseFloat(idxTimeMatch[1])

    // --- Class and name extraction ---
    // textBeforeRaw: everything before "intPart + frac" at the end of textBeforePax
    // This already excludes carNum (it was part of intPart and has been accounted for)
    const rawTimeLength = intPart.length + frac.length // chars to remove = intPart + ".xxx"
    const textBeforeRaw = textBeforePax.slice(0, textBeforePax.length - rawTimeLength)

    // Note: carNum was embedded in intPart. After removing intPart from textBeforePax,
    // textBeforeRaw correctly ends with: ...{name}{class}
    // We do NOT need to strip carNum separately from textBeforeRaw.

    // Class code: trailing uppercase letters (optionally with /subclass)
    const classMatch = textBeforeRaw.match(/([A-Z]{1,6}(?:\/[A-Z]{1,6})?)$/)
    const classCode = classMatch ? classMatch[1] : ''

    if (isNovice(classCode)) continue

    // Name: everything before the class code, after the last digit
    const textBeforeClass = classCode
      ? textBeforeRaw.slice(0, textBeforeRaw.length - classCode.length)
      : textBeforeRaw

    const name = extractName(textBeforeClass)
    if (!name || name.length < 2) continue

    drivers.push({
      name,
      class_code: classCode,
      car_number: carNum,
      raw_time: rawTime,
      pax_index: paxIdx,
      indexed_time: indexedTime,
    })
  }

  // Assign positions from sorted order (PAX PDF is sorted by indexed_time)
  // De-duplicate if any parsing produced duplicates (same name, close times)
  const seen = new Set()
  const deduped = drivers.filter(d => {
    const key = `${d.name}:${d.indexed_time}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return deduped.map((d, i) => ({ ...d, pos: i + 1 }))
}

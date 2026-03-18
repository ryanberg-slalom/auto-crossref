/**
 * Extracts Ryan Berg's individual run times from the OVERALL results PDF.
 *
 * OVERALL format for a driver entry (concatenated):
 * {classPos}{carNum}{name}{year} {make} {model}{(gapFromPrev\}{bestTime}{tires}{run1}{run2}...
 *
 * Cone notation in extracted text:
 *   ·N  =  (N cones)  — displayed time INCLUDES 2s/cone penalty
 *   \\N  =  (N)  — alternate encoding seen in some events
 *   DNF  =  off-course, no valid time
 *   RRN / struck-through (appears as numeric with special prefix) = discard
 *
 * For dual-run events (5, 7, 10):
 *   Runs are listed as all 6 (or 8) times in sequence.
 *   Sessions are split by eventInfo passed in.
 */

const RYAN_NAME = 'Ryan Berg'
const RYAN_TIRES = 'Bridgestone'

/**
 * @param {string} text - extracted OVERALL PDF text
 * @param {{ runsPerSession: number, sessions: number }} eventConfig
 * @returns {{ runs: RunEntry[], best_raw_time: number|null } | null}
 */
export function parseRyanRuns(text, eventConfig) {
  const { runsPerSession = 3, sessions = 1 } = eventConfig

  // Find Ryan's entry
  const ryanIdx = text.indexOf(RYAN_NAME)
  if (ryanIdx === -1) return null

  // Find his tire brand (used as start-of-runs marker)
  const tiresIdx = text.indexOf(RYAN_TIRES, ryanIdx)
  if (tiresIdx === -1) return null

  // Extract the segment after tires — runs appear here
  // Take enough chars to cover all expected runs + some buffer
  // Strip trophy/position markers (e.g. "T2", "T1") that appear inline with run times
  // in some PDFs and cause the following digit to be merged into the time value.
  const runsSegment = text
    .slice(tiresIdx + RYAN_TIRES.length, tiresIdx + RYAN_TIRES.length + 300)
    .replace(/T\d/g, '')

  const runs = extractRunsFromSegment(runsSegment, runsPerSession, sessions)

  // Compute best raw time
  // For single session: best scored_time
  // For dual session: best scored_time from session A + best from session B
  let bestRawTime = null
  if (runs.length > 0) {
    if (sessions === 1) {
      const validRuns = runs.filter(r => !r.dnf && r.scored_time !== null)
      if (validRuns.length > 0) {
        bestRawTime = Math.min(...validRuns.map(r => r.scored_time))
      }
    } else {
      const sessionA = runs.filter(r => r.session === 'a' && !r.dnf && r.scored_time !== null)
      const sessionB = runs.filter(r => r.session === 'b' && !r.dnf && r.scored_time !== null)
      const bestA = sessionA.length > 0 ? Math.min(...sessionA.map(r => r.scored_time)) : null
      const bestB = sessionB.length > 0 ? Math.min(...sessionB.map(r => r.scored_time)) : null
      if (bestA !== null && bestB !== null) {
        bestRawTime = parseFloat((bestA + bestB).toFixed(3))
      }
    }
  }

  return { runs, best_raw_time: bestRawTime }
}

/**
 * Parses run times from the text segment following the tire brand.
 * Handles: clean runs, cone penalties (·N or \N), DNF, and re-runs (RRN).
 */
function extractRunsFromSegment(segment, runsPerSession, sessions) {
  const totalExpected = runsPerSession * sessions
  const runs = []
  let i = 0

  let skipCount = 0

  while (i < segment.length) {
    // Stop once we have all expected runs (allow up to 3 extra for re-runs/cones)
    if (runs.filter(r => !r.rerun).length >= totalExpected + 3) break

    // Skip whitespace
    while (i < segment.length && /\s/.test(segment[i])) i++
    if (i >= segment.length) break

    // Check for DNF
    if (segment.slice(i, i + 3) === 'DNF') {
      const validCount = runs.filter(r => !r.rerun).length
      if (validCount >= totalExpected) break
      const session = sessions > 1
        ? (runs.length < runsPerSession ? 'a' : 'b')
        : 'a'
      runs.push({
        run_number: runs.length + 1,
        session,
        base_time: null,
        scored_time: null,
        cones: 0,
        dnf: true,
        rerun: false,
      })
      i += 3
      skipCount = 0
      continue
    }

    // Try to match a decimal number (2-3 digit integer part)
    const numMatch = segment.slice(i).match(/^(\d{2,3}\.\d{3})/)
    if (!numMatch) {
      // Non-run character — skip, but bail if we've skipped too many (hit next driver)
      skipCount++
      if (skipCount > 80) break
      i++
      continue
    }

    // Verify this looks like a valid run time (not a gap or indexed time)
    const displayedTime = parseFloat(numMatch[1])
    if (displayedTime < 20 || displayedTime > 300) {
      i += numMatch[1].length
      continue
    }

    // Stop if we already have all expected runs and this number doesn't look like a run
    const validCount = runs.filter(r => !r.rerun).length
    if (validCount >= totalExpected) break

    i += numMatch[1].length
    skipCount = 0

    // Check for cone notation after the time: ·N or (N) or (N\ variants
    let cones = 0
    // ·N notation: middle dot followed by exactly 1 cone digit (greedy \d+ would eat into next run time)
    // (N) or (N\ notation: delimited, safe to match 1-2 digits
    const coneMatch = segment.slice(i).match(/^·(\d)/) ||
                      segment.slice(i).match(/^[(\\](\d{1,2})[)\\]/)

    if (coneMatch) {
      cones = parseInt(coneMatch[1], 10)
      i += coneMatch[0].length
    }

    // Check if this is a re-run marker (RRN) — appears as a struck-through time
    // In extracted text, these sometimes show up as the time followed by non-decimal chars
    // For now, we don't have a reliable way to detect struck-through text from raw extraction
    // We'll include the run and flag it if it seems like a duplicate exact time

    const baseTime = parseFloat((displayedTime - 2 * cones).toFixed(3))
    const session = sessions > 1
      ? (runs.filter(r => !r.rerun).length < runsPerSession ? 'a' : 'b')
      : 'a'

    runs.push({
      run_number: runs.length + 1,
      session,
      base_time: baseTime,
      scored_time: displayedTime,
      cones,
      dnf: false,
      rerun: false,
    })
  }

  return runs.slice(0, totalExpected)
}

/**
 * Builds a map of { driverName → carString } by scanning the OVERALL PDF text.
 * Format after name: "{year} {make model}{digits?}({gap}\" or "{year} {make model} {runTime}"
 *
 * @param {string} overallText
 * @param {string[]} names - driver names to look up
 * @returns {Map<string, string>}
 */
export function buildCarMap(overallText, names) {
  const map = new Map()
  for (const name of names) {
    const idx = overallText.indexOf(name)
    if (idx === -1) continue
    const after = overallText.slice(idx + name.length, idx + name.length + 80)
    // Match: 4-digit year + words, stopping before gap notation (\d*\() or a scored run time
    const m = after.match(/^(\d{4} [^(]+?)(?=\d{0,3}\(|\d{2,3}\.\d{3})/)
    if (m) map.set(name, m[1].trim())
  }
  return map
}

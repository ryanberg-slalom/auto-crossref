/**
 * Extracts autocross results from PDF files using the Anthropic API.
 * Uses native PDF document support — no image conversion needed.
 *
 * Three extraction functions:
 *   extractPaxResults(pdfPath)    → [{pos, name, class_code, car_number, raw_time, pax_index, indexed_time}]
 *   extractRawResults(pdfPath)    → [{pos, name, class_code, car_number, raw_time}]
 *   extractFinalResults(pdfPath)  → { format, ryan: {..., runs}, cars: [{name, car}] }
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'

const client = new Anthropic()
const MODEL = 'claude-sonnet-4-6'

function pdfBase64(pdfPath) {
  return readFileSync(pdfPath).toString('base64')
}

function parseJsonResponse(text) {
  // Strip markdown code fences
  const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim()

  // Try direct parse
  try { return JSON.parse(cleaned) } catch {}

  // Find start of first JSON array or object
  const arrIdx = cleaned.indexOf('[')
  const objIdx = cleaned.indexOf('{')
  const start = arrIdx === -1 ? objIdx
    : objIdx === -1 ? arrIdx
    : Math.min(arrIdx, objIdx)

  if (start === -1) {
    throw new Error(`No JSON found. Response starts with: ${text.slice(0, 120)}`)
  }

  try {
    return JSON.parse(cleaned.slice(start))
  } catch (err) {
    throw new Error(`JSON parse failed. Response starts with: ${text.slice(0, 120)}`)
  }
}

/** Use streaming for all API calls to avoid timeout on large responses. */
async function streamExtract(contentBlocks, maxTokens = 16384) {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: contentBlocks }],
  })
  const message = await stream.finalMessage()
  return message.content[0]?.text ?? ''
}

const PAX_PROMPT = `This is a PAX/Indexed results sheet from a Pronto Timing System autocross event.
It shows all drivers ranked by their PAX-indexed score (best = rank 1).

Extract every non-novice driver. Return ONLY a JSON array with no explanation, preamble, or markdown:

[{"pos":1,"name":"Mike Kuhn","class_code":"PRT/SSP","car_number":"196","raw_time":45.312,"pax_index":0.857,"indexed_time":38.832}]

Rules:
- Include ALL drivers in rank order — do not skip any
- EXCLUDE Novice class drivers (class "N", "NOV", or starts with "NOV")
- pos: integer rank (1 = fastest indexed time)
- name: full driver name as shown
- class_code: exactly as shown (e.g. "FS", "CAMT", "SSP", "PST/FS", "PRT/SSP")
- car_number: as shown (string)
- raw_time: driver's best raw time, 3 decimal places
- pax_index: PAX factor (e.g. 0.857), 3 decimal places
- indexed_time: driver's final indexed score, 3 decimal places`

const RAW_PROMPT = `This is a RAW results sheet from a Pronto Timing System autocross event.
It shows all drivers ranked by their best raw time.

Extract every non-novice driver. Return ONLY a JSON array with no explanation, preamble, or markdown:

[{"pos":1,"name":"Bob Smith","class_code":"SSP","car_number":"196","raw_time":42.100}]

Rules:
- Include ALL drivers in rank order
- EXCLUDE Novice class drivers (class "N", "NOV", or starts with "NOV")
- pos: integer rank
- name: full driver name
- class_code: exactly as shown
- car_number: as shown
- raw_time: driver's best raw time, 3 decimal places`

const FINAL_PROMPT = `This is a Pronto Timing System autocross class results PDF.

Extract two things:

1. Find Ryan Berg's entry and extract his complete run data.
2. For ALL drivers (every class), extract their name and car.

Return ONLY JSON with no explanation, preamble, or markdown:

{
  "format": "single_session",
  "ryan": {
    "class": "FS",
    "runs": [
      {"run_number":1,"session":"a","displayed_time":64.379,"cones":0,"base_time":64.379,"scored_time":64.379,"dnf":false,"rerun":false}
    ]
  },
  "cars": [
    {"name":"Ryan Berg","car":"2022 BMW M240i"}
  ]
}

Format detection — "two_session" if ANY of these column header pairs appear together:
- "Course 1" AND "Course 2"
- "Morning" AND "Afternoon"
- "AM" AND "PM"
- "Day 1" AND "Day 2"
- "Session 1" AND "Session 2"
Otherwise "single_session".

Ryan's run rules:
- session: "a" for the first session (Course 1 / Morning / AM / Day 1), "b" for the second (Course 2 / Afternoon / PM / Day 2)
- displayed_time: time as printed (includes cone penalties). null if DNF.
- cones: count from (N) suffix. 0 if clean.
- base_time: displayed_time - (cones * 2). null if DNF.
- scored_time: same as displayed_time. null if DNF.
- dnf: true if DNF or struck-through
- rerun: true if RRN marker

Cars list rules:
- Include every driver from every class
- car: year make model (e.g. "2022 BMW M240i"), null if not shown`

/**
 * Extracts PAX/indexed results from a PAX results PDF.
 * @param {string} pdfPath
 * @returns {Promise<Array>}
 */
export async function extractPaxResults(pdfPath) {
  const text = await streamExtract([
    { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64(pdfPath) } },
    { type: 'text', text: PAX_PROMPT },
  ])
  return parseJsonResponse(text)
}

/**
 * Extracts RAW results from a RAW results PDF.
 * @param {string} pdfPath
 * @returns {Promise<Array>}
 */
export async function extractRawResults(pdfPath) {
  const text = await streamExtract([
    { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64(pdfPath) } },
    { type: 'text', text: RAW_PROMPT },
  ])
  return parseJsonResponse(text)
}

/**
 * Extracts Ryan's runs + car info for all drivers from a FINAL/OVERALL PDF.
 * @param {string} pdfPath
 * @returns {Promise<{format: string, ryan: object|null, cars: Array}>}
 */
export async function extractFinalResults(pdfPath) {
  const text = await streamExtract([
    { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64(pdfPath) } },
    { type: 'text', text: FINAL_PROMPT },
  ], 8192)
  return parseJsonResponse(text)
}

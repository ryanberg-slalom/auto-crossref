/**
 * Extracts text from a Pronto Timing System PDF using raw zlib stream decompression.
 * Works for all events except Event 8 (CIDFont encoding) — use the fallback for those.
 */

import { readFileSync } from 'fs'
import { inflateSync } from 'zlib'

/**
 * @param {string} pdfPath
 * @returns {string} extracted text content
 */
export function extractPdfText(pdfPath) {
  const buf = readFileSync(pdfPath)
  const parts = []

  let offset = 0
  while (offset < buf.length) {
    // Find next stream marker
    const streamStart = buf.indexOf('stream', offset)
    if (streamStart === -1) break

    // Find the end of the stream header line (right after "stream\n" or "stream\r\n")
    let dataStart = streamStart + 6 // length of "stream"
    if (buf[dataStart] === 0x0d) dataStart++ // \r
    if (buf[dataStart] === 0x0a) dataStart++ // \n

    // Find "endstream"
    const streamEnd = buf.indexOf('endstream', dataStart)
    if (streamEnd === -1) break

    const streamData = buf.slice(dataStart, streamEnd)

    try {
      const decompressed = inflateSync(streamData)
      const text = decompressed.toString('latin1')
      // Filter to streams that contain text operators (Tj, TJ, BT, etc.)
      if (text.includes('Tj') || text.includes('TJ')) {
        parts.push(extractTextFromContentStream(text))
      }
    } catch {
      // Not a zlib stream, skip
    }

    offset = streamEnd + 9 // length of "endstream"
  }

  return parts.join('\n')
}

/**
 * Extracts readable text from a PDF content stream.
 * Handles both string Tj operators and array TJ operators.
 */
function extractTextFromContentStream(stream) {
  const chars = []
  let i = 0

  while (i < stream.length) {
    // Look for BT...ET blocks
    const btIdx = stream.indexOf('BT', i)
    if (btIdx === -1) break
    const etIdx = stream.indexOf('ET', btIdx)
    if (etIdx === -1) break

    const block = stream.slice(btIdx + 2, etIdx)
    extractTextFromBlock(block, chars)
    i = etIdx + 2
  }

  return chars.join('')
}

function extractTextFromBlock(block, chars) {
  // Match (string)Tj
  const tjRe = /\(([^)]*)\)\s*Tj/g
  let m
  while ((m = tjRe.exec(block)) !== null) {
    chars.push(decodePdfString(m[1]))
  }

  // Match [(string) spacing (string) ...]TJ
  const tjArrayRe = /\[([^\]]*)\]\s*TJ/g
  while ((m = tjArrayRe.exec(block)) !== null) {
    const inner = m[1]
    const stringRe = /\(([^)]*)\)/g
    let s
    while ((s = stringRe.exec(inner)) !== null) {
      chars.push(decodePdfString(s[1]))
    }
  }
}

function decodePdfString(s) {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
}

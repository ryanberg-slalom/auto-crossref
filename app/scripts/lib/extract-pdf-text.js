/**
 * Extracts text from a Pronto Timing System PDF using raw zlib stream decompression.
 * Handles PDF text positioning operators (Td, TD, Tm, T*) to properly reconstruct
 * row boundaries, which prevents driver entries from being concatenated together.
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
    const streamStart = buf.indexOf('stream', offset)
    if (streamStart === -1) break

    let dataStart = streamStart + 6
    if (buf[dataStart] === 0x0d) dataStart++
    if (buf[dataStart] === 0x0a) dataStart++

    const streamEnd = buf.indexOf('endstream', dataStart)
    if (streamEnd === -1) break

    const streamData = buf.slice(dataStart, streamEnd)

    try {
      const decompressed = inflateSync(streamData)
      const text = decompressed.toString('latin1')
      if (text.includes('Tj') || text.includes('TJ')) {
        parts.push(extractTextFromContentStream(text))
      }
    } catch {
      // Not a zlib stream, skip
    }

    offset = streamEnd + 9
  }

  return parts.join('\n')
}

/**
 * Extracts text from a PDF content stream, preserving row structure by
 * processing BT/ET blocks and emitting newlines on position changes.
 */
function extractTextFromContentStream(stream) {
  const chars = []
  let i = 0

  while (i < stream.length) {
    const btIdx = stream.indexOf('BT', i)
    if (btIdx === -1) break
    const etIdx = stream.indexOf('ET', btIdx)
    if (etIdx === -1) break

    if (chars.length > 0) chars.push('\n')
    extractTextFromBlock(stream.slice(btIdx + 2, etIdx), chars)
    i = etIdx + 2
  }

  return chars.join('')
}

/**
 * Tokenizes and processes a BT/ET block.
 * Uses an operand stack to interpret positioning operators and emit newlines
 * at row boundaries (Td, TD, T*, Tm with changing y-value).
 */
function extractTextFromBlock(block, chars) {
  const tokens = tokenize(block)
  const stack = []
  let lastY = null

  for (const tok of tokens) {
    if (tok.type !== 'kw') {
      stack.push(tok)
      continue
    }

    switch (tok.val) {
      case 'T*':
        chars.push('\n')
        break

      case 'Td':
      case 'TD': {
        // operands: tx ty — ty is top of stack
        const ty = stack.length >= 1 && stack[stack.length - 1].type === 'num'
          ? stack[stack.length - 1].val : 0
        if (ty !== 0) chars.push('\n')
        break
      }

      case 'Tm': {
        // operands: a b c d e f — f (y-position) is top of stack
        const y = stack.length >= 1 && stack[stack.length - 1].type === 'num'
          ? stack[stack.length - 1].val : null
        if (y !== null) {
          if (lastY !== null && Math.abs(y - lastY) > 0.5) chars.push('\n')
          lastY = y
        }
        break
      }

      case 'Tj': {
        const s = stack.length > 0 ? stack[stack.length - 1] : null
        if (s && s.type === 'str') chars.push(decodePdfString(s.val))
        break
      }

      case 'TJ': {
        const a = stack.length > 0 ? stack[stack.length - 1] : null
        if (a && a.type === 'arr') {
          for (const item of a.items) {
            if (item.type === 'str') chars.push(decodePdfString(item.val))
          }
        }
        break
      }
    }

    stack.length = 0
  }
}

/**
 * Tokenizes a PDF content stream into typed tokens.
 * Types: { type: 'str', val }, { type: 'arr', items }, { type: 'num', val },
 *        { type: 'name', val }, { type: 'kw', val }
 */
function tokenize(s) {
  const tokens = []
  let i = 0

  while (i < s.length) {
    const c = s[i]

    // Whitespace
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue }

    // Comment
    if (c === '%') { while (i < s.length && s[i] !== '\n') i++; continue }

    // Literal string (...)
    if (c === '(') {
      let depth = 1
      let j = i + 1
      while (j < s.length && depth > 0) {
        if (s[j] === '\\') { j += 2; continue }
        if (s[j] === '(') depth++
        else if (s[j] === ')') depth--
        j++
      }
      tokens.push({ type: 'str', val: s.slice(i + 1, j - 1) })
      i = j
      continue
    }

    // Array [...] (for TJ)
    if (c === '[') {
      let depth = 1
      let j = i + 1
      while (j < s.length && depth > 0) {
        if (s[j] === '\\') { j += 2; continue }
        if (s[j] === '[') depth++
        else if (s[j] === ']') depth--
        j++
      }
      tokens.push({ type: 'arr', items: tokenize(s.slice(i + 1, j - 1)) })
      i = j
      continue
    }

    // Name /...
    if (c === '/') {
      let j = i + 1
      while (j < s.length && s[j] !== ' ' && s[j] !== '\t' && s[j] !== '\n' &&
             s[j] !== '\r' && s[j] !== '/' && s[j] !== '[' && s[j] !== ']' &&
             s[j] !== '(' && s[j] !== ')' && s[j] !== '<' && s[j] !== '>') j++
      tokens.push({ type: 'name', val: s.slice(i + 1, j) })
      i = j
      continue
    }

    // Number (integer or float, optionally signed)
    if ((c >= '0' && c <= '9') || c === '-' || c === '+' ||
        (c === '.' && i + 1 < s.length && s[i + 1] >= '0' && s[i + 1] <= '9')) {
      let j = i
      if (s[j] === '-' || s[j] === '+') j++
      while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.')) j++
      if (j > i) {
        const n = parseFloat(s.slice(i, j))
        if (!isNaN(n)) { tokens.push({ type: 'num', val: n }); i = j; continue }
      }
    }

    // Keyword/operator (letters, *, ', ")
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '*' || c === '"' || c === "'") {
      let j = i
      while (j < s.length &&
             ((s[j] >= 'A' && s[j] <= 'Z') || (s[j] >= 'a' && s[j] <= 'z') ||
              (s[j] >= '0' && s[j] <= '9') || s[j] === '*' || s[j] === '_')) j++
      if (j > i) { tokens.push({ type: 'kw', val: s.slice(i, j) }); i = j; continue }
    }

    i++ // skip unrecognized character
  }

  return tokens
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

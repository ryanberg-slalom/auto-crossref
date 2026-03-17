/**
 * Fallback PDF text extractor using pdf-parse.
 * Used for Event 8 PDFs which use CIDFont with ToUnicode CMap encoding
 * that our manual zlib extractor cannot handle.
 */

import { createRequire } from 'module'
import { readFileSync } from 'fs'

const require = createRequire(import.meta.url)
const { PDFParse } = require('pdf-parse')

/**
 * @param {string} pdfPath
 * @returns {Promise<string>}
 */
export async function extractPdfTextFallback(pdfPath) {
  const buffer = readFileSync(pdfPath)
  const parser = new PDFParse()
  const data = await parser.parse(buffer)
  return data.text ?? ''
}

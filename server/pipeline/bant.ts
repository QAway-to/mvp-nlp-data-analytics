import { getLlmProvider } from '../llm/provider'
import {
  BANT_SYSTEM_PROMPT,
  buildBantUserPrompt,
  bantRowSchema,
  parseLlmJsonArray,
  type BantRow,
} from '../llm/prompts'
import type { RawListing } from '~/types/pipeline'

const BATCH_SIZE = 50

export interface BantExtracted {
  listing: RawListing
  bant: BantRow
}

export interface BantBatchResult {
  extracted: BantExtracted[]
  failedBatches: number // batches lost to LLM errors — surfaced so run status reflects outages
}

export async function batchExtractBant(
  vertical: string,
  listings: RawListing[],
): Promise<BantBatchResult> {
  const results: BantExtracted[] = []
  let failedBatches = 0

  for (let batchStart = 0; batchStart < listings.length; batchStart += BATCH_SIZE) {
    const batch = listings.slice(batchStart, batchStart + BATCH_SIZE)

    let rawOutput: string
    try {
      rawOutput = await getLlmProvider().complete(
        [
          { role: 'system', content: BANT_SYSTEM_PROMPT },
          { role: 'user', content: buildBantUserPrompt(vertical, batch) },
        ],
        { jsonMode: true },
      )
    } catch (err) {
      failedBatches++
      console.error(
        `[bant] LLM error on batch starting at ${batchStart}:`,
        err instanceof Error ? err.message : err,
      )
      continue
    }

    const parsed = parseLlmJsonArray(rawOutput)

    for (const item of parsed) {
      const result = bantRowSchema.safeParse(item)
      if (!result.success) continue

      const row = result.data
      const listingIndex = row.messageIndex
      // messageIndex is relative to the current batch
      const listing = batch[listingIndex]
      if (!listing) continue

      results.push({ listing, bant: row })
    }
  }

  return { extracted: results, failedBatches }
}

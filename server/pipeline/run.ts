import type { SourceConfig } from '~/types/pipeline'
import { startRun, finishRun } from '../db/repositories/runs.repo'
import { upsertItem, existsByHash, markProcessed } from '../db/repositories/items.repo'
import { upsertContact } from '../db/repositories/contacts.repo'
import { insertLead } from '../db/repositories/leads.repo'
import { touchSource, updateHealth } from '../db/repositories/sources.repo'
import { createAdapterContext } from '../adapters/context'
import { getAdapter } from '../adapters/registry'
import { contentHash } from './normalize'
import { passesStageA } from './prefilter'
import { batchExtractBant } from './bant'
import { routeAndScore } from './route'
import { normalizeHandle } from './contacts'

const MAX_LISTINGS_PER_SOURCE = 200

export interface RunSummary {
  sourceId: number
  fetched: number
  newItems: number
  qualified: number
  errors: number
  runId: number
}

export async function runSource(config: SourceConfig): Promise<RunSummary> {
  const runId = await startRun(config.id)

  let fetched = 0
  let newItems = 0
  let qualified = 0
  let errors = 0
  let errorText: string | null = null

  try {
    const ctx = createAdapterContext()
    const rawListings = await getAdapter(config.adapter).fetch(config, ctx)

    // Cap at MAX_LISTINGS_PER_SOURCE
    const listings = rawListings.slice(0, MAX_LISTINGS_PER_SOURCE)
    fetched = listings.length

    // Step 1: upsert items and collect candidates (new + not cross-source duplicate)
    const candidates: Array<{ itemId: number; listing: (typeof listings)[number] }> = []

    for (const listing of listings) {
      const hash = contentHash(listing.text)

      let itemId: number
      let isNew: boolean
      try {
        const upserted = await upsertItem({
          sourceId: config.id,
          sourceItemId: listing.sourceItemId,
          contentHash: hash,
          url: listing.url,
          title: listing.title,
          text: listing.text,
          ttlDays: config.ttlDays,
        })
        itemId = upserted.id
        isNew = upserted.isNew
      } catch (err) {
        errors++
        console.error(
          `[run] upsertItem failed for source=${config.id} item=${listing.sourceItemId}:`,
          err instanceof Error ? err.message : err,
        )
        continue
      }

      if (!isNew) continue
      newItems++

      // Level-B: cross-source hash dedup (isolate transient DB errors per item)
      try {
        if (await existsByHash(hash, config.id)) {
          await markProcessed(itemId)
          continue
        }
      } catch {
        errors++
        console.error(`[run] level-B dedup failed for item=${itemId}`)
        continue
      }

      candidates.push({ itemId, listing })
    }

    // Step 2: Stage-A prefilter
    const stageAPassed = candidates.filter(({ listing }) =>
      passesStageA(listing.text),
    )

    // Step 3: BANT extraction (batched LLM)
    const { extracted: bantResults, failedBatches } = await batchExtractBant(
      config.vertical,
      stageAPassed.map(({ listing }) => listing),
    )
    errors += failedBatches

    // Build a map from listing reference to itemId for efficient lookup
    const listingToItemId = new Map<object, number>()
    for (const { itemId, listing } of stageAPassed) {
      listingToItemId.set(listing, itemId)
    }

    // Step 4: Route, score, and persist
    for (const { listing, bant } of bantResults) {
      const itemId = listingToItemId.get(listing)
      if (itemId === undefined) continue

      const routed = routeAndScore(bant, listing.impliedContact)

      if (!routed) {
        await markProcessed(itemId)
        continue
      }

      let contactId: number | null = null
      if (routed.contact) {
        try {
          const normalizedHandle = normalizeHandle(routed.contact.type, routed.contact.handle)
          contactId = await upsertContact({
            type: routed.contact.type,
            handle: normalizedHandle,
            display: routed.contact.handle,
          })
        } catch {
          // Generic — pg constraint errors can echo the contact handle (PII); don't log it.
          errors++
          console.error(`[run] upsertContact failed for item=${itemId}`)
        }
      }

      try {
        await insertLead({
          itemId,
          contactId,
          vertical: config.vertical,
          type: routed.type,
          intent: routed.intent,
          warmth: routed.warmth,
          budget: routed.budget,
          verticalMatch: routed.verticalMatch,
          scamFlag: routed.scamFlag,
          score: routed.score,
        })
        qualified++
        await markProcessed(itemId)
      } catch (err) {
        // Leave the item unprocessed so it retries on the next poll.
        errors++
        console.error(`[run] insertLead failed for item=${itemId}:`, err instanceof Error ? err.message : err)
      }
    }

    // Mark Stage-A filtered-out candidates as processed too
    const bantListings = new Set(bantResults.map(({ listing }) => listing))
    for (const { itemId, listing } of stageAPassed) {
      if (!bantListings.has(listing)) {
        await markProcessed(itemId)
      }
    }

    // Mark candidates that failed Stage-A as processed
    const stageAListings = new Set(stageAPassed.map(({ listing }) => listing))
    for (const { itemId, listing } of candidates) {
      if (!stageAListings.has(listing)) {
        await markProcessed(itemId)
      }
    }

    await touchSource(config.id)
    await updateHealth(config.id, qualified)

    const status = errors === 0 ? 'ok' : qualified > 0 ? 'partial' : 'failed'
    await finishRun(runId, { fetched, newItems, qualified, errors, status })

    return { sourceId: config.id, fetched, newItems, qualified, errors, runId }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    errorText = message
    console.error(`[run] source=${config.id} failed:`, message)

    try {
      await touchSource(config.id)
      await updateHealth(config.id, 0)
      await finishRun(runId, { fetched, newItems, qualified, errors, errorText, status: 'failed' })
    } catch (finishErr) {
      console.error(`[run] finishRun failed for source=${config.id}:`, finishErr)
    }

    return { sourceId: config.id, fetched, newItems, qualified, errors: errors + 1, runId }
  }
}

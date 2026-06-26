import { z } from 'zod'
import { assessChat } from '~/server/utils/assessChat'
import { listHandlesToCheck, saveAssessment, countUnchecked } from '~/server/db/repositories/outreach.repo'

// Batch pre-flight: assess a slice of targets (alive / active / ad-policy) and
// store the verdict. Processed in small chunks so the request stays within the
// platform timeout; the UI calls this repeatedly until `remaining` hits 0.

const bodySchema = z.object({
  limit: z.number().int().min(1).max(15).optional(),
  onlyUnchecked: z.boolean().optional(),
})

const PER_REQUEST_GAP_MS = 400 // be gentle on t.me

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event).catch(() => ({})))
  const limit = parsed.success ? parsed.data.limit ?? 8 : 8
  const onlyUnchecked = parsed.success ? parsed.data.onlyUnchecked ?? true : true

  const handles = await listHandlesToCheck(limit, onlyUnchecked)
  let checked = 0
  const verdicts: Array<{ handle: string; recommendation: string }> = []

  for (const handle of handles) {
    const assessment = await assessChat(handle)
    if (assessment) {
      await saveAssessment(assessment)
      verdicts.push({ handle, recommendation: assessment.recommendation })
      checked++
    }
    await new Promise((r) => setTimeout(r, PER_REQUEST_GAP_MS))
  }

  const remaining = onlyUnchecked ? await countUnchecked() : Math.max(0, handles.length - checked)
  return { success: true, checked, remaining, verdicts }
})

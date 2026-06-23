import type { BantRow } from '../llm/prompts'
import type { Intent, ContactType } from '~/types/pipeline'

export interface RouteResult {
  type: 'lead' | 'vacancy'
  contact: { type: ContactType; handle: string } | null
  intent: Intent
  warmth: Intent
  budget: string | null
  verticalMatch: number
  scamFlag: boolean
  score: number
}

type ImpliedContact = { type: ContactType; handle: string } | null | undefined

const INTENT_SCORE: Record<Intent, number> = {
  high: 40,
  medium: 25,
  low: 10,
  none: 0,
}

const WARMTH_SCORE: Record<Intent, number> = {
  high: 25,
  medium: 15,
  low: 5,
  none: 0,
}

export function routeAndScore(
  bant: BantRow,
  impliedContact: ImpliedContact,
): RouteResult | null {
  if (bant.type === 'noise') return null

  const contact = bant.contact ?? impliedContact ?? null

  const intentPoints = INTENT_SCORE[bant.intent]
  const warmthPoints = WARMTH_SCORE[bant.warmth]
  const contactPoints = contact ? 20 : 0
  const budgetPoints = bant.budget ? 15 : 0

  const score = Math.min(
    intentPoints + warmthPoints + contactPoints + budgetPoints,
    100,
  )

  return {
    type: bant.type,
    contact,
    intent: bant.intent,
    warmth: bant.warmth,
    budget: bant.budget,
    verticalMatch: bant.verticalMatch,
    scamFlag: bant.scamFlag,
    score,
  }
}

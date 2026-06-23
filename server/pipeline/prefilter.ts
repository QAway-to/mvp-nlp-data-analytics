import { extractContact } from './contacts'

// High-recall Stage-A gate — only drops obvious non-demand chatter.
// Intent/contact/budget signals (RU + EN). Be permissive; we want recall.
const INTENT_RE =
  /ищу|нужен|нужна|нужны|требуется|требуются|ищем|закажу|заказать|сделать|разработать|помогите|помоги|посоветуйте|порекомендуйте|поищите|найдите|хочу заказать|хочу нанять|ищем специалиста|looking\s+for|need\s+(a\s+|an\s+|someone|help)|hiring|hire|wanted|seeking|search\s+for|budget|\$|₽|руб(?:лей|ля|лёй)?|usd|eur|тысяч|тыс\.|млн|кто\s+может|кто\s+умеет|кто\s+делает|freelan|фрилан|удалённ|удаленн|remote\s+work|part[\s-]time|full[\s-]time|contract/i

export function passesStageA(text: string): boolean {
  if (INTENT_RE.test(text)) return true
  // Fall back: any extractable contact in the text is a positive signal
  if (extractContact(text) !== null) return true
  return false
}

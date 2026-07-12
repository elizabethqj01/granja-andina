import type { Timestamp } from 'firebase/firestore'

// ─── Inventory ───────────────────────────────────────────────────────────────

export type InventoryCategory = 'MP' | 'WIP' | 'PT'

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  quantity: number
  unitCost: number
  maxCapacity: number
}

export interface InventorySnapshot {
  items: Record<string, Pick<InventoryItem, 'quantity' | 'unitCost'>>
  capturedAtTick: number
}

// ─── Production ──────────────────────────────────────────────────────────────

export type ProductionStatus = 'pending' | 'active' | 'completed' | 'paused'

export interface Recipe {
  id: string
  name: string
  mpRequirements: { itemId: string; quantity: number }[]
  laborHoursPerUnit: number
  ticksRequired: number
  outputItem: string
  outputQuantity: number
}

export interface ProductionOrder {
  id: string
  recipeId: string
  quantity: number
  progress: number
  status: ProductionStatus
  accumulatedMPD: number
  accumulatedMOD: number
  accumulatedCIF: number
  startedAtTick: number | null
  completedAtTick: number | null
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export interface CIFBreakdown {
  energy: number
  maintenance: number
  waste: number
}

export interface FinancialState {
  rawMaterialCost: number
  laborCost: number
  cifCost: number
  cifBreakdown: CIFBreakdown
  productionCost: number
  revenue: number
  salesCost: number
  profit: number
}

// ─── ECPV ────────────────────────────────────────────────────────────────────

export interface CostStatement {
  initialMP: number
  purchases: number
  availableMP: number
  finalMP: number
  materialUsed: number

  mod: number
  cif: number

  productionCost: number

  initialWIP: number
  finalWIP: number

  finishedGoodsCost: number

  initialPT: number
  availableForSale: number
  finalPT: number

  salesCost: number

  revenue: number
  profit: number
}

// ─── Gamification ────────────────────────────────────────────────────────────

export type GameLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export type DynamicEventType =
  | 'supplier_crisis'
  | 'demand_surge'
  | 'machine_failure'
  | 'waste_spike'

export interface EventResponseEffect {
  laborMultiplier?: number
  cifWasteAddition?: number
  priceMultiplier?: number
  speedMultiplier?: number
  cashDebitOnce?: number
  reduceDurationTo?: number
}

export interface EventResponse {
  id: 'A' | 'B' | 'C'
  label: string
  description: string
  costLabel: string
  pedagogicalHint: string
  effect: EventResponseEffect
}

export interface DynamicEvent {
  id: string
  type: DynamicEventType
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  effectDurationTicks: number
  appliedAtTick: number
  responses: EventResponse[]
  chosenResponseId: 'A' | 'B' | 'C' | null
  pedagogicalNote: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  secret?: boolean
  unlockedAtTick: number | null
}

export interface PlayerState {
  xp: number
  level: GameLevel
  achievements: Achievement[]
  activeEvents: DynamicEvent[]
}

// ─── Market Orders ────────────────────────────────────────────────────────────

export interface MarketOrder {
  id: string
  clientName: string
  quantity: number
  offerPricePerUnit: number
  deadlineTick: number
  issuedAtTick: number
  status: 'pending' | 'accepted' | 'fulfilled' | 'failed' | 'rejected'
  bonusMultiplier: number
}

// ─── Progress / Level Objectives ─────────────────────────────────────────────

export type LevelStars = 0 | 1 | 2 | 3

export interface LevelObjective {
  level: GameLevel
  description: string
  detail: string
  maxTicks: number
  starThresholds: { two: number; three: number }
}

export interface ConceptMastery {
  concept: string
  label: string
  status: 'ok' | 'pending' | 'missing'
  note: string
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export type AnalyticsEventType =
  | 'purchase_mp'
  | 'create_order'
  | 'complete_order'
  | 'sell_pt'
  | 'event_triggered'
  | 'panel_opened'
  | 'ecpv_viewed'
  | 'level_completed'

export interface AnalyticsEvent {
  sessionId: string
  userId: string
  tick: number
  eventType: AnalyticsEventType
  decisionTimeMs: number
  payload: Record<string, unknown>
}

// ─── Session ─────────────────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'completed' | 'abandoned'

export interface GameSession {
  id: string
  userId: string
  level: GameLevel
  status: SessionStatus
  startedAt: Timestamp
  completedAt: Timestamp | null
  finalScore: number | null
  finalProfit: number | null
  decisionCount: number
}

// ─── User (Firestore users/{uid}) ─────────────────────────────────────────────

export type UserRole = 'estudiante' | 'profesor'

export interface UserBestRecords {
  bestTimeByLevel: Record<string, number>
  bestCostUnitarioByLevel: Record<string, number>
  bestUtilidadByLevel: Record<string, number>
  // Not in the original especificaciones.md §1.2 schema, but required to keep
  // totalScore/starsTotal (each "SUMA de la mejor marca por nivel") correct
  // when a level's best attempt is overwritten by an even better one.
  bestScoreByLevel: Record<string, number>
  bestStarsByLevel: Record<string, number>
}

export interface AppUser {
  uid: string
  email: string
  displayName: string
  photoURL: string
  role: UserRole
  groupId: string | null
  groupChangedAt: Timestamp | null
  totalScore: number
  starsTotal: number
  levelsCompleted: number
  bestRecords: UserBestRecords
  createdAt: Timestamp
  lastLoginAt: Timestamp
}

// ─── Groups / Scores / Ranking ─────────────────────────────────────────────────

export interface Group {
  codigo: string
  nombre: string
  profesorUid: string
  activo: boolean
  createdAt: Timestamp
}

export interface ScoreEntry {
  uid: string
  displayName: string
  levelId: GameLevel
  score: number
  stars: LevelStars
  timeSeconds: number
  costoUnitario: number
  utilidad: number
  groupId: string | null
  createdAt: Timestamp
}

export interface RankingEntry {
  uid: string
  displayName: string
  photoURL: string
  totalScore: number
  starsTotal: number
}

// Computed live from direct Firestore queries (subscribeToRecords) — no
// Cloud Function involved, so there's no single "last aggregated at" moment.
export interface GlobalRecords {
  menorCostoUnitario: { uid: string; displayName: string; value: number } | null
  tiempoMasRapido: { uid: string; displayName: string; value: number } | null
  mayorUtilidad: { uid: string; displayName: string; value: number } | null
}

// ─── Evaluation mode (EV-01 / EV-02) ───────────────────────────────────────────

export interface ScoreBreakdown {
  metas: number
  correctitud: number
  tiempo: number
  costoUnitario: number
}

export interface Assessment {
  userId: string
  levelId: GameLevel
  nota: number // 0.0–5.0, escala colombiana (score / 20)
  breakdown: ScoreBreakdown
  timeSeconds: number
  completedAt: Timestamp
}

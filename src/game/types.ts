import type { Color, Square } from 'chess.js'

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

export type PromotionPiece = 'q' | 'r' | 'b' | 'n'

export interface ChessMove {
  from: Square
  to: Square
  promotion?: PromotionPiece
}

export interface DifficultyProfile {
  readonly level: DifficultyLevel
  readonly name: string
  readonly description: string
  readonly searchDepth: number
  readonly timeLimitMs: number
  readonly maxNodes: number
  readonly randomMoveChance: number
  readonly candidatePool: number
  readonly evaluationNoise: number
}

export type PlayerColor = Color

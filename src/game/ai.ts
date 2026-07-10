import { Chess, type Color, type Move } from 'chess.js'
import { getDifficultyProfile } from './difficulties'
import {
  CHECKMATE_SCORE,
  evaluatePosition,
  evaluateStaticPosition,
  PIECE_VALUES,
} from './evaluation'
import { toChessMove } from './rules'
import type { ChessMove, DifficultyLevel, DifficultyProfile } from './types'

interface SearchContext {
  readonly deadline: number
  readonly maxNodes: number
  nodes: number
  aborted: boolean
}

interface ScoredMove {
  move: Move
  score: number
}

/** Retorna `null` apenas quando a posição já terminou e não há jogadas legais. */
export function getComputerMove(fen: string, level: DifficultyLevel): ChessMove | null {
  const game = new Chess(fen)
  let rootMoves = orderMoves(game.moves({ verbose: true }))

  if (rootMoves.length === 0) return null

  const profile = getDifficultyProfile(level)

  if (Math.random() < profile.randomMoveChance) {
    return toChessMove(rootMoves[randomIndex(rootMoves.length)])
  }

  const context: SearchContext = {
    deadline: now() + profile.timeLimitMs,
    maxNodes: profile.maxNodes,
    nodes: 0,
    aborted: false,
  }

  const perspective = game.turn()
  let bestCompletedSearch: ScoredMove[] = rootMoves.map((move) => ({ move, score: 0 }))

  // A busca iterativa sempre preserva o resultado da última profundidade concluída.
  for (let depth = 1; depth <= profile.searchDepth; depth += 1) {
    const result = searchRoot(game, rootMoves, depth, perspective, context)
    if (context.aborted) break
    bestCompletedSearch = result
    // A melhor variante da profundidade anterior é examinada primeiro. Isso
    // aumenta os cortes alpha-beta sem mudar a avaliação nem a força da IA.
    rootMoves = result.map(({ move }) => move)
  }

  return toChessMove(selectMove(bestCompletedSearch, profile).move)
}

function searchRoot(
  game: Chess,
  moves: Move[],
  depth: number,
  perspective: Color,
  context: SearchContext,
): ScoredMove[] {
  const scoredMoves: ScoredMove[] = []
  let alpha = -Infinity

  for (const move of moves) {
    if (shouldStop(context)) break

    game.move(move)
    const score = alphaBeta(game, depth - 1, alpha, Infinity, perspective, context, 1)
    game.undo()

    scoredMoves.push({ move, score })
    alpha = Math.max(alpha, score)
  }

  return scoredMoves.sort((a, b) => b.score - a.score)
}

function alphaBeta(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  perspective: Color,
  context: SearchContext,
  ply: number,
): number {
  context.nodes += 1

  if (shouldStop(context)) {
    return evaluatePosition(game, perspective)
  }

  const moves = orderMoves(game.moves({ verbose: true }))
  if (moves.length === 0) {
    if (!game.inCheck()) return 0
    return game.turn() === perspective
      ? -CHECKMATE_SCORE + ply
      : CHECKMATE_SCORE - ply
  }

  // Afogamento já foi coberto pela ausência de jogadas. As demais regras
  // de empate continuam sendo verificadas integralmente.
  if (
    game.isInsufficientMaterial() ||
    game.isThreefoldRepetition() ||
    game.isDrawByFiftyMoves()
  ) return 0

  if (depth === 0) return evaluateStaticPosition(game, perspective)

  const maximizing = game.turn() === perspective

  if (maximizing) {
    let value = -Infinity

    for (const move of moves) {
      game.move(move)
      value = Math.max(
        value,
        alphaBeta(game, depth - 1, alpha, beta, perspective, context, ply + 1),
      )
      game.undo()

      if (context.aborted) break
      alpha = Math.max(alpha, value)
      if (alpha >= beta) break
    }

    return value
  }

  let value = Infinity

  for (const move of moves) {
    game.move(move)
    value = Math.min(
      value,
      alphaBeta(game, depth - 1, alpha, beta, perspective, context, ply + 1),
    )
    game.undo()

    if (context.aborted) break
    beta = Math.min(beta, value)
    if (alpha >= beta) break
  }

  return value
}

function selectMove(moves: ScoredMove[], profile: DifficultyProfile): ScoredMove {
  const ranked = moves
    .map((entry) => ({
      ...entry,
      adjustedScore:
        entry.score + (Math.random() * 2 - 1) * profile.evaluationNoise,
    }))
    .sort((a, b) => b.adjustedScore - a.adjustedScore)

  const poolSize = Math.min(profile.candidatePool, ranked.length)
  return ranked[randomIndex(poolSize)]
}

function orderMoves(moves: Move[]): Move[] {
  return moves.sort((a, b) => movePriority(b) - movePriority(a))
}

function movePriority(move: Move): number {
  let score = 0

  if (move.captured) {
    score += PIECE_VALUES[move.captured] * 10 - PIECE_VALUES[move.piece]
  }

  if (move.promotion) score += PIECE_VALUES[move.promotion] + 800
  if (move.san.includes('#')) score += CHECKMATE_SCORE
  else if (move.san.includes('+')) score += 80

  return score
}

function shouldStop(context: SearchContext): boolean {
  if (context.aborted) return true

  if (context.nodes >= context.maxNodes || now() >= context.deadline) {
    context.aborted = true
  }

  return context.aborted
}

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length)
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now()
}

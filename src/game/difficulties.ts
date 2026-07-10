import type { DifficultyLevel, DifficultyProfile } from './types'

export const DIFFICULTIES = [
  {
    level: 1,
    name: 'Aprendiz',
    description: 'Joga de forma descontraída e deixa oportunidades para quem está começando.',
    searchDepth: 1,
    timeLimitMs: 40,
    maxNodes: 250,
    randomMoveChance: 0.72,
    candidatePool: 6,
    evaluationNoise: 180,
  },
  {
    level: 2,
    name: 'Competidor',
    description: 'Reconhece ameaças imediatas, mas ainda assume riscos e comete imprecisões.',
    searchDepth: 2,
    timeLimitMs: 100,
    maxNodes: 1_200,
    randomMoveChance: 0.34,
    candidatePool: 4,
    evaluationNoise: 95,
  },
  {
    level: 3,
    name: 'Estrategista',
    description: 'Equilibra tática, desenvolvimento e segurança do rei.',
    searchDepth: 2,
    timeLimitMs: 240,
    maxNodes: 4_500,
    randomMoveChance: 0.1,
    candidatePool: 3,
    evaluationNoise: 35,
  },
  {
    level: 4,
    name: 'Mestre',
    description: 'Calcula combinações mais longas e raramente oferece material sem compensação.',
    searchDepth: 3,
    timeLimitMs: 520,
    maxNodes: 16_000,
    randomMoveChance: 0.02,
    candidatePool: 2,
    evaluationNoise: 10,
  },
  {
    level: 5,
    name: 'Grão-Mestre',
    description: 'Usa a busca mais profunda disponível e sempre escolhe a melhor linha encontrada.',
    searchDepth: 4,
    timeLimitMs: 900,
    maxNodes: 40_000,
    randomMoveChance: 0,
    candidatePool: 1,
    evaluationNoise: 0,
  },
] as const satisfies readonly DifficultyProfile[]

export function getDifficultyProfile(level: DifficultyLevel): DifficultyProfile {
  const profile = DIFFICULTIES.find((difficulty) => difficulty.level === level)

  if (!profile) {
    throw new RangeError(`Nível de dificuldade inválido: ${String(level)}`)
  }

  return profile
}

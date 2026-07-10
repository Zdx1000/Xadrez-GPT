import { getComputerMove } from './ai'
import type { DifficultyLevel } from './types'

interface AiRequest {
  id: number
  fen: string
  level: DifficultyLevel
}

self.onmessage = (event: MessageEvent<AiRequest>) => {
  const { id, fen, level } = event.data
  const move = getComputerMove(fen, level)
  self.postMessage({ id, fen, move })
}

export {}

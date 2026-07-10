import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Color } from 'chess.js'

export const INITIAL_TIME = 10 * 60 * 1000

export type ClockSnapshot = Readonly<Record<Color, number>>

export interface GameClock {
  getSnapshot: () => ClockSnapshot
  subscribe: (listener: () => void) => () => void
}

type TimeoutHandler = (color: Color) => void

/**
 * Relógio monotônico independente do ciclo de renderização do tabuleiro.
 * O tempo exato é calculado a partir de `performance.now()`, enquanto os
 * assinantes visuais são notificados no máximo uma vez por segundo.
 */
export class GameClockStore implements GameClock {
  private remaining: Record<Color, number> = { w: INITIAL_TIME, b: INITIAL_TIME }
  private snapshot: ClockSnapshot = { w: INITIAL_TIME, b: INITIAL_TIME }
  private listeners = new Set<() => void>()
  private activeColor: Color | null = null
  private startedAt = 0
  private displayTimer: ReturnType<typeof globalThis.setTimeout> | null = null
  private timeoutTimer: ReturnType<typeof globalThis.setTimeout> | null = null
  private timeoutHandler: TimeoutHandler | null = null

  getSnapshot = () => this.snapshot

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  reset() {
    this.stopTimers()
    this.activeColor = null
    this.remaining = { w: INITIAL_TIME, b: INITIAL_TIME }
    this.updateSnapshot(true)
  }

  start(color: Color, onTimeout: TimeoutHandler) {
    this.pause()
    const available = this.remaining[color]
    if (available <= 0) {
      onTimeout(color)
      return
    }

    this.activeColor = color
    this.startedAt = now()
    this.timeoutHandler = onTimeout
    this.scheduleDisplayTick()
    this.timeoutTimer = globalThis.setTimeout(() => this.finishTurn(), available)
  }

  pause() {
    this.commitElapsed()
    this.stopTimers()
    this.activeColor = null
    this.timeoutHandler = null
    this.updateSnapshot()
  }

  dispose() {
    this.pause()
    this.listeners.clear()
  }

  private finishTurn() {
    const color = this.activeColor
    const onTimeout = this.timeoutHandler
    if (!color || !onTimeout) return

    this.remaining[color] = 0
    this.stopTimers()
    this.activeColor = null
    this.timeoutHandler = null
    this.updateSnapshot(true)
    onTimeout(color)
  }

  private commitElapsed() {
    if (!this.activeColor) return

    const color = this.activeColor
    const currentTime = now()
    this.remaining[color] = Math.max(0, this.remaining[color] - (currentTime - this.startedAt))
    this.startedAt = currentTime
  }

  private exactRemaining(color: Color) {
    if (color !== this.activeColor) return this.remaining[color]
    return Math.max(0, this.remaining[color] - (now() - this.startedAt))
  }

  private updateSnapshot(force = false) {
    const next = {
      w: displayMilliseconds(this.exactRemaining('w')),
      b: displayMilliseconds(this.exactRemaining('b')),
    }

    if (!force && next.w === this.snapshot.w && next.b === this.snapshot.b) return
    this.snapshot = next
    this.listeners.forEach((listener) => listener())
  }

  private scheduleDisplayTick() {
    if (!this.activeColor) return
    const remaining = this.exactRemaining(this.activeColor)
    const partialSecond = remaining % 1000
    const delay = partialSecond > 1 ? partialSecond : 1000

    this.displayTimer = globalThis.setTimeout(() => {
      this.displayTimer = null
      this.updateSnapshot()
      this.scheduleDisplayTick()
    }, delay)
  }

  private stopTimers() {
    if (this.displayTimer !== null) globalThis.clearTimeout(this.displayTimer)
    if (this.timeoutTimer !== null) globalThis.clearTimeout(this.timeoutTimer)
    this.displayTimer = null
    this.timeoutTimer = null
  }
}

export function useGameClock(
  active: boolean,
  turn: Color,
  resetKey: number,
  onTimeout: TimeoutHandler,
): GameClock {
  const [clock] = useState(() => new GameClockStore())

  useEffect(() => {
    clock.reset()
  }, [clock, resetKey])

  useEffect(() => {
    if (active) clock.start(turn, onTimeout)
    else clock.pause()

    return () => clock.pause()
  }, [active, clock, onTimeout, resetKey, turn])

  useEffect(() => () => clock.dispose(), [clock])

  return clock
}

export function useClockTime(clock: GameClock, color: Color) {
  const snapshot = useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getSnapshot)
  return snapshot[color]
}

export function formatClock(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function displayMilliseconds(milliseconds: number) {
  if (milliseconds <= 0) return 0
  return Math.ceil(milliseconds / 1000) * 1000
}

function now() {
  return globalThis.performance?.now() ?? Date.now()
}

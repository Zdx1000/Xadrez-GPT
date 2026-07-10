import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  displayMilliseconds,
  GameClockStore,
  INITIAL_TIME,
} from './useGameClock'

describe('relógio da partida', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('notifica a interface somente na virada visual de cada segundo', () => {
    const clock = new GameClockStore()
    const listener = vi.fn()
    clock.subscribe(listener)
    clock.start('w', vi.fn())

    vi.advanceTimersByTime(999)
    expect(listener).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(clock.getSnapshot()).toEqual({ w: INITIAL_TIME - 1000, b: INITIAL_TIME })

    clock.dispose()
  })

  it('mantém a contagem exata e dispara o estouro uma única vez', () => {
    const clock = new GameClockStore()
    const onTimeout = vi.fn()
    clock.start('b', onTimeout)

    vi.advanceTimersByTime(INITIAL_TIME)

    expect(clock.getSnapshot().b).toBe(0)
    expect(onTimeout).toHaveBeenCalledOnce()
    expect(onTimeout).toHaveBeenCalledWith('b')
    clock.dispose()
  })

  it('preserva a fração de segundo ao pausar e retomar um lado', () => {
    const clock = new GameClockStore()
    const listener = vi.fn()
    clock.subscribe(listener)
    clock.start('w', vi.fn())
    vi.advanceTimersByTime(400)
    clock.pause()
    clock.start('w', vi.fn())

    vi.advanceTimersByTime(599)
    expect(listener).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(clock.getSnapshot().w).toBe(INITIAL_TIME - 1000)
    expect(listener).toHaveBeenCalledOnce()
    clock.dispose()
  })

  it('arredonda apenas a apresentação, sem segundos pulados', () => {
    expect(displayMilliseconds(599_999.1)).toBe(600_000)
    expect(displayMilliseconds(599_000)).toBe(599_000)
    expect(displayMilliseconds(-1)).toBe(0)
  })
})

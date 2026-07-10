import { useCallback, useEffect, useRef, useState } from 'react'

type ChessSound = 'move' | 'capture' | 'check' | 'castle' | 'select' | 'win' | 'lose'

interface AudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}

export function useChessAudio() {
  const [enabled, setEnabled] = useState(true)
  const enabledRef = useRef(enabled)
  const contextRef = useRef<AudioContext | null>(null)

  // O callback de reprodução permanece estável. Além de evitar trabalho
  // desnecessário nos consumidores, isso impede que alternar o som reinicie
  // efeitos não relacionados, como uma busca da IA em andamento.
  enabledRef.current = enabled

  useEffect(
    () => () => {
      void contextRef.current?.close()
    },
    [],
  )

  const play = useCallback((sound: ChessSound) => {
    if (!enabledRef.current) return

    const AudioContextConstructor = window.AudioContext || (window as AudioWindow).webkitAudioContext
    if (!AudioContextConstructor) return

    const context = contextRef.current ?? new AudioContextConstructor()
    contextRef.current = context
    if (context.state === 'suspended') void context.resume()

    const now = context.currentTime
    const master = context.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(sound === 'capture' ? 0.2 : 0.12, now + 0.008)
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)
    master.connect(context.destination)

    const tones: Record<ChessSound, Array<[number, number, OscillatorType]>> = {
      select: [[620, 0, 'sine']],
      move: [[190, 0, 'sine'], [285, 0.07, 'triangle']],
      capture: [[130, 0, 'sawtooth'], [95, 0.08, 'triangle']],
      check: [[440, 0, 'triangle'], [659, 0.1, 'sine']],
      castle: [[220, 0, 'sine'], [330, 0.08, 'triangle'], [440, 0.16, 'sine']],
      win: [[330, 0, 'sine'], [440, 0.1, 'sine'], [659, 0.2, 'sine']],
      lose: [[300, 0, 'triangle'], [210, 0.12, 'sine'], [140, 0.22, 'sine']],
    }

    tones[sound].forEach(([frequency, delay, type]) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, now + delay)
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.88, now + delay + 0.2)
      gain.gain.setValueAtTime(0.0001, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.65, now + delay + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.24)
      oscillator.connect(gain)
      gain.connect(master)
      oscillator.start(now + delay)
      oscillator.stop(now + delay + 0.28)
    })
  }, [])

  return { audioEnabled: enabled, setAudioEnabled: setEnabled, playSound: play }
}

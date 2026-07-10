import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'

const url = process.env.AUREUS_URL ?? 'http://127.0.0.1:4173'
const executablePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const deviceScaleFactor = Number(process.env.AUREUS_DPR ?? 1)
const sampleDuration = Number(process.env.AUREUS_PROFILE_MS ?? 2_500)
let serverProcess = null

async function serverIsReady() {
  try {
    return (await fetch(url)).ok
  } catch {
    return false
  }
}

async function ensureServer() {
  if (await serverIsReady()) return
  if (process.env.AUREUS_URL) throw new Error(`Servidor indisponível em ${url}.`)

  serverProcess = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4173'],
    { cwd: process.cwd(), stdio: 'ignore' },
  )

  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (await serverIsReady()) return
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('O servidor Vite não iniciou a tempo.')
}

await ensureServer()

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor,
  })

  await page.addInitScript(() => {
    const framebufferIds = new WeakMap()
    let nextFramebufferId = 1
    let currentFramebuffer = 'default'

    globalThis.__aureusProfile = {
      draws: 0,
      triangles: 0,
      byFramebuffer: {},
    }

    const registerDraw = (mode, count, instances = 1) => {
      const profile = globalThis.__aureusProfile
      profile.draws += 1
      profile.byFramebuffer[currentFramebuffer] = (profile.byFramebuffer[currentFramebuffer] ?? 0) + 1
      if (mode === 4) profile.triangles += (count / 3) * instances
      else if (mode === 5 || mode === 6) profile.triangles += Math.max(0, count - 2) * instances
    }

    for (const constructorName of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
      const prototype = globalThis[constructorName]?.prototype
      if (!prototype) continue

      const originalBindFramebuffer = prototype.bindFramebuffer
      if (typeof originalBindFramebuffer === 'function' && !originalBindFramebuffer.__aureusWrapped) {
        const wrappedBindFramebuffer = function (target, framebuffer) {
          if (!framebuffer) currentFramebuffer = 'default'
          else {
            if (!framebufferIds.has(framebuffer)) framebufferIds.set(framebuffer, nextFramebufferId++)
            currentFramebuffer = `fbo-${framebufferIds.get(framebuffer)}`
          }
          return originalBindFramebuffer.call(this, target, framebuffer)
        }
        wrappedBindFramebuffer.__aureusWrapped = true
        prototype.bindFramebuffer = wrappedBindFramebuffer
      }

      for (const methodName of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
        const original = prototype[methodName]
        if (typeof original !== 'function' || original.__aureusWrapped) continue
        const wrapped = function (...args) {
          const count = methodName.includes('Arrays') ? args[2] : args[1]
          const instances = methodName === 'drawArraysInstanced'
            ? args[3]
            : methodName === 'drawElementsInstanced'
              ? args[4]
              : 1
          registerDraw(args[0], count, instances)
          return original.apply(this, args)
        }
        wrapped.__aureusWrapped = true
        prototype[methodName] = wrapped
      }
    }
  })

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Iniciar partida' }).click()
  await page.waitForSelector('.game-app canvas', { state: 'visible' })
  await page.waitForTimeout(4_000)

  const result = await page.evaluate(async (duration) => {
    const canvas = document.querySelector('canvas')
    const gl = canvas.getContext('webgl2')
    const rendererInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const profile = globalThis.__aureusProfile
    profile.draws = 0
    profile.triangles = 0
    profile.byFramebuffer = {}

    let frames = 0
    const started = performance.now()
    await new Promise((resolve) => {
      const tick = (now) => {
        frames += 1
        if (now - started >= duration) resolve()
        else requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    const elapsed = performance.now() - started

    return {
      renderer: rendererInfo ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL) : 'indisponível',
      buffer: `${gl.drawingBufferWidth}×${gl.drawingBufferHeight}`,
      elapsedMs: Math.round(elapsed),
      sampledFrames: frames,
      fps: Number((frames / elapsed * 1_000).toFixed(2)),
      drawsPerFrame: Math.round(profile.draws / frames),
      trianglesPerFrame: Math.round(profile.triangles / frames),
      framebufferDraws: Object.fromEntries(
        Object.entries(profile.byFramebuffer)
          .map(([key, value]) => [key, Math.round(value / frames)])
          .sort((left, right) => right[1] - left[1]),
      ),
    }
  }, sampleDuration)

  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser.close()
  serverProcess?.kill()
}

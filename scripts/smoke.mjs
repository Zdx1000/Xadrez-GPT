import { chromium } from 'playwright-core'
import * as THREE from 'three'
import { spawn } from 'node:child_process'

const url = process.env.AUREUS_URL ?? 'http://127.0.0.1:4173'
const executablePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outputDirectory = process.env.TEMP ?? process.cwd()
const captureScreenshots = process.env.AUREUS_SCREENSHOTS === '1'
const keepFullEffects = process.env.AUREUS_SMOKE_FULL_EFFECTS === '1'
const consoleErrors = []
let serverProcess = null

async function serverIsReady() {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

async function ensureServer() {
  if (await serverIsReady()) return
  if (process.env.AUREUS_URL) {
    throw new Error(`O servidor informado não está disponível em ${url}.`)
  }

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

function projectSquare(square, canvasBox, height = 0.36) {
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1]) - 1
  const camera = new THREE.PerspectiveCamera(39, canvasBox.width / canvasBox.height, 0.1, 70)
  camera.position.set(8.25, 8.1, 10.4)
  camera.lookAt(0, 0.35, 0)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()

  const projected = new THREE.Vector3(file - 3.5, height, 3.5 - rank).project(camera)
  return {
    x: canvasBox.x + ((projected.x + 1) / 2) * canvasBox.width,
    y: canvasBox.y + ((1 - projected.y) / 2) * canvasBox.height,
  }
}

await ensureServer()

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`console: ${message.text()}`)
  })

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForSelector('.start-screen__panel', { state: 'visible' })
  const menuText = await page.locator('body').innerText()
  const normalizedMenuText = menuText.toLocaleLowerCase('pt-BR')
  if (!menuText.includes('AUREUS') || !normalizedMenuText.includes('iniciar partida')) {
    throw new Error(`A tela inicial não apresentou os controles esperados. Conteúdo: ${menuText.slice(0, 800)}`)
  }
  if (captureScreenshots) {
    await page.screenshot({ path: `${outputDirectory}\\aureus-menu.png`, fullPage: true, timeout: 60_000 })
  }

  await page.getByRole('button', { name: 'Iniciar partida' }).click()
  await page.waitForSelector('.game-app canvas', { state: 'visible' })
  await page.waitForTimeout(3500)

  // Software WebGL used by CI can spend several seconds in each postprocessed
  // frame. Mount the premium path first, then exercise the direct-AA path for
  // deterministic interaction unless a full-effects run was explicitly asked.
  if (!keepFullEffects) {
    await page.getByRole('button', { name: 'Desativar efeitos' }).click()
    await page.waitForSelector('.game-app canvas', { state: 'visible' })
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.game-app canvas')
      const bounds = canvas?.getBoundingClientRect()
      return Boolean(bounds && bounds.width >= 500 && bounds.height >= 400)
    }, undefined, { timeout: 30_000 })
  }

  const canvasBox = await page.locator('.game-app canvas').boundingBox()
  if (!canvasBox || canvasBox.width < 500 || canvasBox.height < 400) {
    throw new Error('O canvas 3D não recebeu uma área útil de renderização.')
  }

  const from = projectSquare('e2', canvasBox, 1.05)
  const to = projectSquare('e4', canvasBox)
  await page.mouse.click(from.x, from.y)
  await page.waitForTimeout(500)
  const selectionHint = await page.locator('.game-stage__hint').innerText()
  if (!selectionHint.includes('E2')) {
    throw new Error(`A casa e2 não foi selecionada em ${JSON.stringify(from)}. Estado: ${selectionHint}`)
  }
  await page.mouse.click(to.x, to.y)
  await page.waitForFunction(
    () => document.querySelector('.move-history__table')?.textContent?.includes('e4'),
    undefined,
    { timeout: 5000 },
  )
  await page.waitForFunction(
    () => (document.querySelector('.move-history__header > span')?.textContent ?? '').includes('2 lances'),
    undefined,
    { timeout: 15_000 },
  )
  if (captureScreenshots) {
    await page.screenshot({ path: `${outputDirectory}\\aureus-game.png`, fullPage: true, timeout: 60_000 })
  }

  if (consoleErrors.length > 0) {
    throw new Error(`Erros no navegador:\n${consoleErrors.join('\n')}`)
  }

  console.log(JSON.stringify({ menu: true, game: true, humanMove: 'e2-e4', aiReply: true, canvas: canvasBox, consoleErrors: 0 }))
} finally {
  await browser.close()
  serverProcess?.kill()
}

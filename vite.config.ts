import { defineConfig, type Plugin, type ResolvedConfig } from 'vite'
import react from '@vitejs/plugin-react'

const COMPRESSIBLE_ASSET = /\.(?:css|html|js|json|mjs|svg|wasm|xml)$/i
const MINIMUM_COMPRESSION_SIZE = 1024

function precompressProductionAssets(): Plugin {
  let resolvedConfig: ResolvedConfig

  return {
    name: 'precompress-production-assets',
    apply: 'build',
    configResolved(config) {
      resolvedConfig = config
    },
    async closeBundle() {
      // Vite executes its config in Node; dynamic imports keep Node-only code out of the app bundle.
      // @ts-expect-error Node type declarations are intentionally not an app dependency.
      const { readdir, readFile, writeFile } = await import('node:fs/promises')
      // @ts-expect-error Node type declarations are intentionally not an app dependency.
      const { resolve } = await import('node:path')
      // @ts-expect-error Node type declarations are intentionally not an app dependency.
      const { promisify } = await import('node:util')
      // @ts-expect-error Node type declarations are intentionally not an app dependency.
      const { brotliCompress, constants, gzip } = await import('node:zlib')

      const gzipAsync = promisify(gzip)
      const brotliAsync = promisify(brotliCompress)
      const outputDirectory = resolve(resolvedConfig.root, resolvedConfig.build.outDir)

      async function findAssets(directory: string): Promise<string[]> {
        const entries: Array<{ isDirectory(): boolean; name: string }> = await readdir(directory, {
          withFileTypes: true,
        })
        const paths = await Promise.all(entries.map(async (entry) => {
          const path = resolve(directory, entry.name)
          return entry.isDirectory() ? findAssets(path) : [path]
        }))

        return paths.flat()
      }

      const assets = (await findAssets(outputDirectory)).filter((path) => COMPRESSIBLE_ASSET.test(path))
      let originalBytes = 0
      let gzipBytes = 0
      let brotliBytes = 0
      let compressedFiles = 0

      await Promise.all(assets.map(async (path) => {
        const source: Uint8Array = await readFile(path)
        if (source.byteLength < MINIMUM_COMPRESSION_SIZE) return

        const [gzipOutput, brotliOutput]: Uint8Array[] = await Promise.all([
          gzipAsync(source, { level: 9 }),
          brotliAsync(source, {
            params: {
              [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
              [constants.BROTLI_PARAM_QUALITY]: 10,
            },
          }),
        ])

        await Promise.all([
          writeFile(`${path}.gz`, gzipOutput),
          writeFile(`${path}.br`, brotliOutput),
        ])

        originalBytes += source.byteLength
        gzipBytes += gzipOutput.byteLength
        brotliBytes += brotliOutput.byteLength
        compressedFiles += 1
      }))

      if (compressedFiles > 0) {
        const kib = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`
        resolvedConfig.logger.info(
          `precompressed ${compressedFiles} assets: ${kib(originalBytes)} original, ${kib(gzipBytes)} gzip, ${kib(brotliBytes)} brotli`,
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), precompressProductionAssets()],
  server: { host: true },
})

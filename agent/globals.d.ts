/**
 * `src/data/config.ts` reads `import.meta.env.VITE_DATA_SOURCE`, typed
 * against Vite's `ImportMetaEnv` augmentation (`vite/client`). Agent's own
 * tsconfig has no Vite dependency, so this is the minimal shim needed to
 * typecheck files the mock backend pulls in from `src/`. It changes no
 * runtime behaviour — see `mcp/mockBackend.ts`'s header for the real,
 * runtime-only gap this does not fix (`import.meta.env` is `undefined`
 * outside Vite/Vitest).
 */

interface ImportMetaEnv {
  readonly [key: string]: string | boolean | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

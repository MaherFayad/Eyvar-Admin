/**
 * Vite's `ImportMetaEnv` shim so agent's tsconfig can typecheck files
 * pulled in from `src/` (`src/data/config.ts` reads `import.meta.env`).
 * No runtime effect — see `mcp/mockBackend.ts`'s header for the real gap.
 */

interface ImportMetaEnv {
  readonly [key: string]: string | boolean | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

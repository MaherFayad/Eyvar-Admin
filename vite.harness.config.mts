/* Scratch: a private optimizer cache so this worktree's dev server does not
   fight the eight others sharing one node_modules junction. Not committed. */
import { mergeConfig } from 'vite'
import base from './vite.config'

export default mergeConfig(base, {
  cacheDir:
    'C:/Users/Admin/AppData/Local/Temp/claude/c--Users-Admin-Documents-GitHub-Eyvar-Admin/f8690b17-d1ed-4ee1-b5dd-d775d19afbb7/scratchpad/vite-cache',
})

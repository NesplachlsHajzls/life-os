// Module-level auth cache — survives Next.js client-side navigations within the same session.
// On first page load: cachedUser = undefined → triggers async getSession()
// After login / first resolve: cachedUser = User | null → instant access, no waterfall

import type { User } from '@supabase/supabase-js'

export let cachedUser: User | null | undefined = undefined

export function setCachedUser(u: User | null) {
  cachedUser = u
}

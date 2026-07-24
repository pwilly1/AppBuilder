import type { Page, PageAccess, PageAccessMode } from '../schema/types'

export const DEFAULT_PAGE_ACCESS: PageAccess = { mode: 'public' }

export type PageAccessResolution = {
  pageId: string | null
  redirected: boolean
  unavailable: boolean
}

export function normalizePageAccess(value: unknown): PageAccess {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_PAGE_ACCESS }
  const access = value as Record<string, unknown>
  const mode = normalizePageAccessMode(access.mode)
  const redirectPageId = typeof access.redirectPageId === 'string'
    ? access.redirectPageId.trim()
    : ''

  return {
    mode,
    ...(redirectPageId ? { redirectPageId } : {}),
  }
}

export function isPageAccessible(
  page: Pick<Page, 'access'>,
  signedIn: boolean,
): boolean {
  const mode = normalizePageAccess(page.access).mode
  if (mode === 'signedIn') return signedIn
  if (mode === 'signedOut') return !signedIn
  return true
}

export function resolvePageAccess(
  pages: Array<Pick<Page, 'id' | 'access'>>,
  requestedPageId: string | null | undefined,
  signedIn: boolean,
): PageAccessResolution {
  if (pages.length === 0) {
    return { pageId: null, redirected: false, unavailable: true }
  }

  const pagesById = new Map(pages.map((page) => [page.id, page]))
  const requestedPage = requestedPageId ? pagesById.get(requestedPageId) : undefined
  let currentPage: Pick<Page, 'id' | 'access'> | undefined = requestedPage ?? pages[0]
  const visited = new Set<string>()

  while (currentPage && !visited.has(currentPage.id)) {
    visited.add(currentPage.id)
    if (isPageAccessible(currentPage, signedIn)) {
      return {
        pageId: currentPage.id,
        redirected: currentPage.id !== requestedPageId,
        unavailable: false,
      }
    }

    const redirectPageId: string | undefined = normalizePageAccess(currentPage.access).redirectPageId
    currentPage = redirectPageId ? pagesById.get(redirectPageId) : undefined
  }

  const fallback = pages.find((page) => isPageAccessible(page, signedIn))
  return {
    pageId: fallback?.id ?? null,
    redirected: Boolean(fallback && fallback.id !== requestedPageId),
    unavailable: !fallback,
  }
}

function normalizePageAccessMode(value: unknown): PageAccessMode {
  if (value === 'signedIn' || value === 'signedOut') return value
  return 'public'
}

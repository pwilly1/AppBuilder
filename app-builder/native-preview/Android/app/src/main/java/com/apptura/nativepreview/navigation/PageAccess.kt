package com.apptura.nativepreview.navigation

import com.apptura.nativepreview.models.Page

internal fun isPageAccessible(page: Page, signedIn: Boolean): Boolean {
    return when (normalizePageAccessMode(page.access?.mode)) {
        "signedIn" -> signedIn
        "signedOut" -> !signedIn
        else -> true
    }
}

internal fun resolveAccessiblePageIndex(
    pages: List<Page>,
    requestedPageId: String?,
    signedIn: Boolean,
): Int? {
    if (pages.isEmpty()) return null

    val pagesById = pages.associateBy { it.id }
    var currentPage = requestedPageId?.let(pagesById::get) ?: pages.first()
    val visited = mutableSetOf<String>()

    while (visited.add(currentPage.id)) {
        if (isPageAccessible(currentPage, signedIn)) {
            return pages.indexOfFirst { it.id == currentPage.id }.takeIf { it >= 0 }
        }

        val redirectPageId = currentPage.access?.redirectPageId?.trim().orEmpty()
        currentPage = pagesById[redirectPageId] ?: break
    }

    return pages.indexOfFirst { isPageAccessible(it, signedIn) }.takeIf { it >= 0 }
}

private fun normalizePageAccessMode(mode: String?): String {
    return when (mode) {
        "signedIn", "signedOut" -> mode
        else -> "public"
    }
}

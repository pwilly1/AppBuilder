// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.renderers

import androidx.compose.runtime.Composable
import com.apptura.nativepreview.models.Block

@Composable
fun BlockRenderer(
    block: Block,
    projectId: String? = null,
    baseUrl: String? = null,
    onNavigate: ((String) -> Unit)? = null
) {
    when (block.type) {
        "hero" -> HeroView(block)
        "text" -> TextView(block)
        "navButton" -> NavButtonView(block, onNavigate = onNavigate)
        "shape" -> ShapeView(block)
        "badge" -> BadgeView(block)
        "icon" -> IconView(block)
        "checkbox" -> CheckboxView(block)
        "toggle" -> ToggleView(block)
        "progressBar" -> ProgressBarView(block)
        "input" -> InputView(block)
        "textarea" -> TextareaView(block)
        "servicesList" -> ServicesListView(block)
        "contactForm" -> ContactFormView(block, projectId = projectId, baseUrl = baseUrl)
        "imageGallery" -> ImageGalleryView(block)
        else -> Unit
    }
}

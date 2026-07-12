// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.renderers

import androidx.compose.runtime.Composable
import com.apptura.nativepreview.models.Block

@Composable
fun BlockRenderer(
    block: Block,
    projectId: String? = null,
    baseUrl: String? = null,
    formRuntime: FormRuntimeState? = null,
    content: @Composable () -> Unit = {},
    onNavigate: ((String) -> Unit)? = null
) {
    when (block.type) {
        "container" -> ContainerView(block, content = content)
        "form" -> FormView(block, content = content)
        "hero" -> HeroView(block)
        "text" -> TextView(block)
        "navButton" -> NavButtonView(block, onNavigate = onNavigate)
        "submitButton" -> SubmitButtonView(block, projectId, baseUrl, formRuntime)
        "shape" -> ShapeView(block)
        "badge" -> BadgeView(block)
        "icon" -> IconView(block, onNavigate)
        "checkbox" -> CheckboxView(block, formRuntime)
        "toggle" -> ToggleView(block, formRuntime)
        "progressBar" -> ProgressBarView(block)
        "input" -> InputView(block, formRuntime)
        "textarea" -> TextareaView(block, formRuntime)
        "image" -> ImageBlockView(block, onNavigate)
        "servicesList" -> ServicesListView(block)
        "contactForm" -> ContactFormView(block, projectId = projectId, baseUrl = baseUrl)
        "imageGallery" -> ImageGalleryView(block)
        else -> Unit
    }
}

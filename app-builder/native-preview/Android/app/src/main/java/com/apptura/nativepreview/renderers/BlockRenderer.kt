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
    runtimeContext: RuntimeContext = RuntimeContext(),
    content: @Composable () -> Unit = {},
    onNavigate: ((String) -> Unit)? = null
) {
    when (block.type) {
        "container" -> ContainerView(block, content = content)
        "form" -> FormView(block, content = content)
        "hero" -> HeroView(block, runtimeContext)
        "text" -> TextView(block, runtimeContext)
        "button" -> ButtonView(block, projectId, baseUrl, formRuntime, runtimeContext, onNavigate)
        "shape" -> ShapeView(block)
        "badge" -> BadgeView(block)
        "icon" -> IconView(block, onNavigate, runtimeContext, formRuntime)
        "checkbox" -> CheckboxView(block, formRuntime)
        "toggle" -> ToggleView(block, formRuntime)
        "progressBar" -> ProgressBarView(block)
        "input" -> InputView(block, formRuntime)
        "textarea" -> TextareaView(block, formRuntime)
        "image" -> ImageBlockView(block, onNavigate, runtimeContext, formRuntime)
        "dataList" -> DataListView(block, projectId, baseUrl)
        "servicesList" -> ServicesListView(block)
        "contactForm" -> ContactFormView(block, projectId = projectId, baseUrl = baseUrl)
        "imageGallery" -> ImageGalleryView(block)
        else -> Unit
    }
}

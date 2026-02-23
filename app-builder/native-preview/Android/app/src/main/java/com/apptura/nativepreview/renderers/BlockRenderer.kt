// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.renderers

import androidx.compose.runtime.Composable
import com.apptura.nativepreview.models.Block

@Composable
fun BlockRenderer(block: Block, onNavigate: ((String) -> Unit)? = null) {
    when (block.type) {
        "hero" -> HeroView(block)
        "text" -> TextView(block)
        "navButton" -> NavButtonView(block, onNavigate)
        else -> Unit
    }
}

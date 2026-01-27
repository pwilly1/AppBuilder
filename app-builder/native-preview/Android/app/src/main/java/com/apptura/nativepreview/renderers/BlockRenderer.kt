// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.renderers

import androidx.compose.runtime.Composable
import com.apptura.nativepreview.models.Block
import com.apptura.nativepreview.models.BlockType

@Composable
fun BlockRenderer(block: Block) {
    when (block.type) {
        BlockType.hero -> HeroView(block)
        BlockType.text -> TextView(block)
    }
}

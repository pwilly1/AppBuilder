package com.apptura.nativepreview.renderers

import com.apptura.nativepreview.models.Block
import kotlin.math.min

fun getBlockContentScale(block: Block): Float {
    val layout = block.layout ?: return 1f
    val grid = layout.grid ?: return 1f
    val base = layout.scaleBase ?: return 1f

    if (layout.resizeBehavior != "scaleContent") return 1f
    if (base.colSpan <= 0 || base.rowSpan <= 0) return 1f

    val scaleX = grid.colSpan.toFloat() / base.colSpan.toFloat()
    val scaleY = grid.rowSpan.toFloat() / base.rowSpan.toFloat()
    val scale = min(scaleX, scaleY)

    if (!scale.isFinite() || scale <= 0f) return 1f
    return scale
}

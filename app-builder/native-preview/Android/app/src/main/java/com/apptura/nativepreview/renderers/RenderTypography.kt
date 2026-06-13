package com.apptura.nativepreview.renderers

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp

@Composable
fun previewSp(cssPx: Float): TextUnit {
    val fontScale = LocalDensity.current.fontScale
    return (cssPx / fontScale).sp
}

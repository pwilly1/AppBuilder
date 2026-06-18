package com.apptura.nativepreview.renderers

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.apptura.nativepreview.models.Block

@Composable
fun SpacerView(@Suppress("UNUSED_PARAMETER") block: Block) {
    Box(modifier = Modifier.fillMaxSize())
}

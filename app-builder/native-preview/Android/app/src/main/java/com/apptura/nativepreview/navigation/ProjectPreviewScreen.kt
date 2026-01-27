// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.navigation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Project
import com.apptura.nativepreview.renderers.BlockRenderer

@Composable
fun ProjectPreviewScreen(project: Project) {
    val pageIndex = remember { mutableStateOf(0) }
    val pages = project.pages

    Scaffold(
        topBar = {
            TopAppBar(title = { Text(text = if (pages.isNotEmpty()) pages[pageIndex.value].name else "Preview") })
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(12.dp)) {
            if (pages.isEmpty()) {
                Text("No pages in project")
            } else {
                val page = pages[pageIndex.value]
                page.blocks.forEach { block ->
                    BlockRenderer(block)
                }
            }
        }
    }
}

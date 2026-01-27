// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import com.apptura.nativepreview.navigation.ProjectPreviewScreen
import com.apptura.nativepreview.models.ProjectLoader

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(color = MaterialTheme.colorScheme.background) {
                    val project = ProjectLoader.loadFromAssets(this, "SampleProject.json")
                    ProjectPreviewScreen(project)
                }
            }
        }
    }
}

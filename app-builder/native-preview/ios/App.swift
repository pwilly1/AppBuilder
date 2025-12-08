import SwiftUI

@main
struct NativePreviewApp: App {
    @StateObject private var loader = JSONLoader()

    var body: some Scene {
        WindowGroup {
            if let project = loader.project {
                ProjectPreviewView(project: project)
                    .environmentObject(loader)
            } else {
                ImportProjectView()
                    .environmentObject(loader)
            }
        }
    }
}

import SwiftUI

struct ProjectPreviewView: View {
    let project: Project
    @State private var selectedPageIndex: Int = 0

    var body: some View {
        VStack {
            Picker("Page", selection: $selectedPageIndex) {
                ForEach(project.pages.indices, id: \.self) { idx in
                    Text(project.pages[idx].name).tag(idx)
                }
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(project.pages[selectedPageIndex].blocks) { block in
                        BlockRenderer(block: block)
                    }
                }
                .padding(.vertical)
            }
        }
    }
}

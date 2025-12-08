import SwiftUI
import UniformTypeIdentifiers

struct ImportProjectView: View {
    @EnvironmentObject var loader: JSONLoader
    @State private var showPicker = false

    var body: some View {
        VStack(spacing: 16) {
            Text("Import JSON Schema")
                .font(.title2)
            Button("Pick JSON File") {
                showPicker = true
            }
            .buttonStyle(.borderedProminent)

            Button("Load Sample Project") {
                if let url = Bundle.main.url(forResource: "SampleProject", withExtension: "json") {
                    loader.load(from: url)
                }
            }
        }
        .fileImporter(
            isPresented: $showPicker,
            allowedContentTypes: [UTType.json]
        ) { result in
            switch result {
            case .success(let url): loader.load(from: url)
            case .failure(let error): loader.error = error.localizedDescription
            }
        }
        .padding()
    }
}

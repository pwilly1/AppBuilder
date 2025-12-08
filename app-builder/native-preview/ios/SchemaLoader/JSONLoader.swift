import Foundation
import SwiftUI

final class JSONLoader: ObservableObject {
    @Published var project: Project?
    @Published var error: String?

    func load(from url: URL) {
        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            let project = try decoder.decode(Project.self, from: data)
            self.project = project
            self.error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

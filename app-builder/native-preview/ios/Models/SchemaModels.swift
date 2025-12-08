import Foundation
import SwiftUI

enum BlockType: String, Codable {
    case hero
    case text
}

struct Block: Codable, Identifiable {
    let id: String
    let type: BlockType
    let props: [String: CodableValue]
}

struct Page: Codable, Identifiable {
    let id: String
    let name: String
    let blocks: [Block]
}

struct Project: Codable {
    let pages: [Page]
}

// Heterogeneous value container for props
enum CodableValue: Codable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: CodableValue])
    case array([CodableValue])

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let s = try? container.decode(String.self) { self = .string(s); return }
        if let n = try? container.decode(Double.self) { self = .number(n); return }
        if let b = try? container.decode(Bool.self) { self = .bool(b); return }
        if let o = try? container.decode([String: CodableValue].self) { self = .object(o); return }
        if let a = try? container.decode([CodableValue].self) { self = .array(a); return }
        throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unsupported value")
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let s): try container.encode(s)
        case .number(let n): try container.encode(n)
        case .bool(let b): try container.encode(b)
        case .object(let o): try container.encode(o)
        case .array(let a): try container.encode(a)
        }
    }
}

extension CodableValue {
    var stringValue: String? { if case .string(let s) = self { return s } else { return nil } }
    var doubleValue: Double? { if case .number(let n) = self { return n } else { return nil } }
}

import SwiftUI

struct BlockRenderer: View {
    let block: Block

    var body: some View {
        switch block.type {
        case .hero:
            HeroView(props: HeroProps.from(block.props))
        case .text:
            TextView(props: TextProps.from(block.props))
        }
    }
}

struct HeroProps {
    let headline: String
    let subhead: String

    static func from(_ dict: [String: CodableValue]) -> HeroProps {
        let headline = dict["headline"]?.stringValue ?? "Headline"
        let subhead = dict["subhead"]?.stringValue ?? ""
        return HeroProps(headline: headline, subhead: subhead)
    }
}

struct TextProps {
    let value: String
    let fontSize: CGFloat

    static func from(_ dict: [String: CodableValue]) -> TextProps {
        let value = dict["value"]?.stringValue ?? "Text"
        let fontSize = CGFloat(dict["fontSize"]?.doubleValue ?? 16.0)
        return TextProps(value: value, fontSize: fontSize)
    }
}

import SwiftUI

struct HeroView: View {
    let props: HeroProps

    var body: some View {
        VStack(spacing: 8) {
            Text(props.headline)
                .font(.system(size: 28, weight: .bold))
                .multilineTextAlignment(.center)
            if !props.subhead.isEmpty {
                Text(props.subhead)
                    .font(.system(size: 18))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .center)
    }
}

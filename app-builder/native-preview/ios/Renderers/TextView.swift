import SwiftUI

struct TextView: View {
    let props: TextProps

    var body: some View {
        Text(props.value)
            .font(.system(size: props.fontSize))
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal)
    }
}

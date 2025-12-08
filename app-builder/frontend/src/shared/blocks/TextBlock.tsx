// shared/blocks-native/blocks/TextBlock.tsx
import { Text, View } from 'react-native';
export function TextBlock({ value, fontSize }: { value: string; fontSize?: number }) {
  return (
    <View style={{ padding: 12 }}>
      <Text style={{ fontSize: fontSize ?? 16 }}>{value}</Text>
    </View>
  );
}

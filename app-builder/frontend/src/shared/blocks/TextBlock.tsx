// shared/blocks-native/blocks/TextBlock.tsx
import { Text, View } from 'react-native';
export function TextBlock({ value }: { value: string }) {
  return (
    <View style={{ padding: 12 }}>
      <Text>{value}</Text>
    </View>
  );
}

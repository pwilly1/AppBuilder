import { View, Text } from 'react-native';

export function Hero({ headline, subhead, headlineSize }: { headline: string; subhead?: string; headlineSize?: number }) {
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: headlineSize ?? 28, fontWeight: '700' }}>{headline}</Text>
      {subhead ? <Text style={{ marginTop: 8 }}>{subhead}</Text> : null}
    </View>
  );
}

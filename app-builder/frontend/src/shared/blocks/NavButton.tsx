import { Pressable, Text, View } from 'react-native';

export function NavButton({
  label,
  toPageId,
  onNavigate,
}: {
  label?: string;
  toPageId?: string;
  onNavigate?: (pageId: string) => void;
}) {
  const text = label || 'Go';
  const disabled = !toPageId;

  return (
    <View style={{ padding: 12 }}>
      <Pressable
        onPress={() => {
          if (!toPageId) return;
          onNavigate?.(toPageId);
        }}
        style={{
          backgroundColor: disabled ? '#e5e7eb' : '#0f172a',
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 10,
          alignSelf: 'flex-start',
        }}
      >
        <Text style={{ color: disabled ? '#475569' : 'white', fontSize: 14, fontWeight: '600' }}>{text}</Text>
      </Pressable>
    </View>
  );
}

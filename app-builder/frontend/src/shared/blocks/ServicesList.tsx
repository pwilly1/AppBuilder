import { Text, View } from 'react-native';

type ServiceItem = {
  name?: string;
  description?: string;
  price?: string;
};

export function ServicesList({
  title,
  items,
}: {
  title?: string;
  items?: ServiceItem[];
}) {
  const safeItems = items && items.length > 0 ? items : [];

  return (
    <View style={{ padding: 16, gap: 12 }}>
      {title ? <Text style={{ fontSize: 24, fontWeight: '700' }}>{title}</Text> : null}
      {safeItems.map((item, index) => (
        <View
          key={`${item.name ?? 'service'}-${index}`}
          style={{
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 14,
            padding: 14,
            backgroundColor: '#ffffff',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a' }}>{item.name ?? 'Service'}</Text>
              {item.description ? (
                <Text style={{ marginTop: 6, fontSize: 14, color: '#475569', lineHeight: 20 }}>{item.description}</Text>
              ) : null}
            </View>
            {item.price ? <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>{item.price}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

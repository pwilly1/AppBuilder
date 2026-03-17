import { Image, Text, View } from 'react-native';
import type { DimensionValue } from 'react-native';

type GalleryImage = {
  url?: string;
  caption?: string;
};

export function ImageGallery({
  title,
  images,
  columns,
}: {
  title?: string;
  images?: GalleryImage[];
  columns?: number;
}) {
  const safeImages = images && images.length > 0 ? images : [];
  const safeColumns = Math.max(1, Math.min(columns ?? 2, 3));
  const itemWidth: DimensionValue = `${100 / safeColumns}%`;

  return (
    <View style={{ padding: 16 }}>
      {title ? <Text style={{ marginBottom: 12, fontSize: 24, fontWeight: '700', color: '#0f172a' }}>{title}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
        {safeImages.map((image, index) => (
          <View key={`${image.caption ?? 'image'}-${index}`} style={{ width: itemWidth, paddingHorizontal: 6, marginBottom: 12 }}>
            {image.url ? (
              <Image
                source={{ uri: image.url }}
                style={{ width: '100%', aspectRatio: 1, borderRadius: 14, backgroundColor: '#e2e8f0' }}
              />
            ) : (
              <View
                style={{
                  width: '100%',
                  aspectRatio: 1,
                  borderRadius: 14,
                  backgroundColor: '#e2e8f0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 12,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', textAlign: 'center' }}>
                  {image.caption || 'Gallery image'}
                </Text>
              </View>
            )}
            {image.caption ? (
              <Text style={{ marginTop: 6, fontSize: 13, color: '#475569', textAlign: 'center' }}>{image.caption}</Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

import { Image } from 'expo-image';
import { useState } from 'react';
import { Dimensions, FlatList, RefreshControl } from 'react-native';
import { VIDEO_FEED } from '@/constants/mock-data';
import { useSocial } from '@/constants/social-context';
import { haptics } from '@/services/haptics';
import { VideoFeedCard } from './video-feed-item';

export function VideoFeed() {
  const { height } = Dimensions.get('window');
  const { blocked } = useSocial();
  const [refreshing, setRefreshing] = useState(false);

  const items = VIDEO_FEED.filter((item) => !blocked.includes(item.authorName));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Nothing to refetch against a mock backend - preloading the thumbnails
      // at least makes the next swipe instant.
      await Image.prefetch(items.map((i) => i.videoThumbnail));
    } finally {
      setRefreshing(false);
      haptics.light();
    }
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <VideoFeedCard item={item} />}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={height}
      decelerationRate="fast"
      getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
      }
      className="absolute inset-0 z-40 bg-black"
    />
  );
}

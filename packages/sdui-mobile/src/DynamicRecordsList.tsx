import React from 'react';
import { FlatList, RefreshControl, Text, View, ViewStyle } from 'react-native';
import type { DataTableResponse } from '@issonujha/sdui-core';
import { ClaudeRecordCard } from './ClaudeRecordCard.js';

export interface DynamicRecordsListProps<T> {
  data: DataTableResponse<T> | T[];
  refreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onCardPress?: (item: T) => void;
  onPrimaryAction?: (item: T) => void;
  emptyLabel?: string;
  renderItem?: ({ item, index }: { item: T; index: number }) => React.ReactElement | null;
  keyExtractor?: (item: T, index: number) => string;
  contentContainerStyle?: ViewStyle;
  ListEmptyComponent?: React.ReactElement | null;
  ListHeaderComponent?: React.ReactElement | null;
  tintColor?: string;
}

/**
 * Renders the content of a DataTableResponse or record array as a FlatList.
 * Pagination state is owned by the host; this component only signals `onLoadMore` when the end is reached.
 */
export function DynamicRecordsList<T extends { id?: string | number }>({
  data,
  refreshing,
  onRefresh,
  onLoadMore,
  onCardPress,
  onPrimaryAction,
  emptyLabel = 'No records',
  renderItem,
  keyExtractor,
  contentContainerStyle,
  ListEmptyComponent,
  ListHeaderComponent,
  tintColor,
}: DynamicRecordsListProps<T>) {
  const items: T[] = Array.isArray(data) ? data : (data as DataTableResponse<T>)?.content ?? [];

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor ?? ((item: any, index: number) => String(item?.id ?? index))}
        renderItem={
          renderItem ??
          (({ item }: { item: any }) => (
            <ClaudeRecordCard
              item={item}
              onPress={onCardPress ? () => onCardPress(item) : undefined}
              onPrimaryAction={onPrimaryAction ? () => onPrimaryAction(item) : undefined}
            />
          ))
        }
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={tintColor} />
          ) : undefined
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={contentContainerStyle}
        ListEmptyComponent={
          ListEmptyComponent !== undefined ? (
            ListEmptyComponent
          ) : items.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text>{emptyLabel}</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={ListHeaderComponent}
      />
    </View>
  );
}

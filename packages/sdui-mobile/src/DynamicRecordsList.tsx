import React from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import type { DataTableResponse } from '@dukaandaar/sdui-core';
import { ClaudeRecordCard } from './ClaudeRecordCard';

export interface DynamicRecordsListProps<T> {
  data: DataTableResponse<T>;
  refreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onCardPress?: (item: T) => void;
  onPrimaryAction?: (item: T) => void;
  emptyLabel?: string;
}

/**
 * Renders the content of a DataTableResponse as a FlatList. Pagination state is owned
 * by the host; this component only signals `onLoadMore` when the end is reached.
 */
export function DynamicRecordsList<T extends { id?: string }>({
  data,
  refreshing,
  onRefresh,
  onLoadMore,
  onCardPress,
  onPrimaryAction,
  emptyLabel = 'No records',
}: DynamicRecordsListProps<T>) {
  const items = data.content ?? [];

  return (
    <View style={{ flex: 1 }}>
      {items.length === 0 ? (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text>{emptyLabel}</Text>
        </View>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item, index) => String(item.id ?? index)}
        renderItem={({ item }) => (
          <ClaudeRecordCard
            item={item}
            onPress={onCardPress ? () => onCardPress(item) : undefined}
            onPrimaryAction={onPrimaryAction ? () => onPrimaryAction(item) : undefined}
          />
        )}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} /> : undefined
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.4}
      />
    </View>
  );
}

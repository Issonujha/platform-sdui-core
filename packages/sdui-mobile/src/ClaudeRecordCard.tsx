import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { ColumnDef } from '@dukaandaar/sdui-core';

export interface ClaudeRecordCardProps<T> {
  item: T;
  columns?: ColumnDef<T>[];
  titleKey?: string;
  subtitleKey?: string;
  onPress?: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}

/**
 * Neutral record card that renders a couple of fields from the item. The host may pass
 * explicit `columns`/`titleKey`/`subtitleKey`, otherwise the first string fields are used.
 */
export function ClaudeRecordCard<T>({
  item,
  columns,
  titleKey,
  subtitleKey,
  onPress,
  onPrimaryAction,
  primaryActionLabel = 'Open',
}: ClaudeRecordCardProps<T>) {
  const record = item as Record<string, unknown>;
  const resolvedColumns = columns ?? [];
  const title = titleKey ? String(record[titleKey] ?? '') : String(resolvedColumns[0] ? record[resolvedColumns[0].key] ?? '' : '');
  const subtitle = subtitleKey
    ? String(record[subtitleKey] ?? '')
    : String(resolvedColumns[1] ? record[resolvedColumns[1].key] ?? '' : '');

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
        <Text style={{ fontWeight: '600' }}>{title}</Text>
        {subtitle ? <Text>{subtitle}</Text> : null}
        {onPrimaryAction && (
          <TouchableOpacity onPress={onPrimaryAction}>
            <Text style={{ color: '#2563eb', marginTop: 6 }}>{primaryActionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export interface StageQueueItem {
  id: string;
  label: string;
  count?: number;
}

export interface MobileStageQueueProps {
  stages: StageQueueItem[];
  activeStageId?: string;
  onSelect?: (stageId: string) => void;
}

/** Horizontal stage rail used on order/workflow screens. */
export function MobileStageQueue({ stages, activeStageId, onSelect }: MobileStageQueueProps) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 8 }}>
      {stages.map((stage) => {
        const active = stage.id === activeStageId;
        return (
          <TouchableOpacity
            key={stage.id}
            onPress={() => onSelect?.(stage.id)}
            style={{ paddingHorizontal: 12, paddingVertical: 6, opacity: active ? 1 : 0.6 }}
          >
            <Text style={{ fontWeight: active ? '700' : '400' }}>
              {stage.label}
              {stage.count !== undefined ? ` (${stage.count})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

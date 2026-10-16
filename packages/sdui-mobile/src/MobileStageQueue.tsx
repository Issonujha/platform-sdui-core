import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, ViewStyle, TextStyle } from 'react-native';

export interface StageQueueItem {
  id: string;
  label: string;
  count?: number;
  color?: string;
  icon?: string;
}

export interface MobileStageQueueProps {
  stages: StageQueueItem[];
  activeStageId?: string;
  onSelect?: (stageId: string) => void;
  containerStyle?: ViewStyle;
  itemStyle?: ViewStyle;
  activeItemStyle?: ViewStyle;
  labelStyle?: TextStyle;
  activeLabelStyle?: TextStyle;
  activeColor?: string;
  inactiveColor?: string;
  renderIcon?: (icon: string, active: boolean) => React.ReactNode;
}

/** Horizontal stage rail used on order/workflow screens. */
export function MobileStageQueue({
  stages,
  activeStageId,
  onSelect,
  containerStyle,
  itemStyle,
  activeItemStyle,
  labelStyle,
  activeLabelStyle,
  activeColor = '#2563EB',
  inactiveColor = '#6B7280',
  renderIcon,
}: MobileStageQueueProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[{ flexDirection: 'row', alignItems: 'center' }, containerStyle]}
    >
      {stages.map((stage) => {
        const active = stage.id === activeStageId;
        return (
          <TouchableOpacity
            key={stage.id}
            onPress={() => onSelect?.(stage.id)}
            activeOpacity={0.75}
            style={[
              {
                paddingHorizontal: 12,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomWidth: active ? 2 : 0,
                borderBottomColor: activeColor,
              },
              itemStyle,
              active ? activeItemStyle : undefined,
            ]}
          >
            {stage.icon && renderIcon ? renderIcon(stage.icon, active) : null}
            <Text
              style={[
                {
                  fontSize: 13,
                  fontWeight: active ? '700' : '500',
                  color: active ? activeColor : inactiveColor,
                },
                labelStyle,
                active ? activeLabelStyle : undefined,
              ]}
            >
              {stage.label}
            </Text>
            {stage.count !== undefined && stage.count > 0 ? (
              <View
                style={{
                  backgroundColor: active ? activeColor : '#E5E7EB',
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 10,
                  marginLeft: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: active ? '#FFFFFF' : '#374151',
                  }}
                >
                  {stage.count}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { FilterDef } from '@issonujha/sdui-core';

export interface FilterBottomSheetProps {
  visible: boolean;
  filters: FilterDef[];
  onClose: () => void;
  onChange?: (key: string, value: unknown) => void;
}

/** Simple modal listing each filter dimension as a tappable row. */
export function FilterBottomSheet({ visible, filters, onClose, onChange }: FilterBottomSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <View style={{ backgroundColor: 'white', maxHeight: '70%', padding: 16 }}>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Filters</Text>
          <ScrollView>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                onPress={() => onChange?.(filter.key, filter.defaultValue)}
                style={{ paddingVertical: 12 }}
              >
                <Text>{filter.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={{ textAlign: 'center' }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

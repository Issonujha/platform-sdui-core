import React, { useState, useEffect } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  TextInput,
  Switch,
} from 'react-native';
import type { FilterDef, FilterOption } from '@issonujha/sdui-core';

export interface FilterBottomSheetTheme {
  primaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  textMutedColor?: string;
  borderColor?: string;
}

export interface FilterBottomSheetProps {
  visible: boolean;
  filters: FilterDef[];
  activeValues?: Record<string, unknown>;
  onClose: () => void;
  onApply?: (values: Record<string, unknown>) => void;
  onReset?: () => void;
  title?: string;
  applyText?: string;
  resetText?: string;
  theme?: FilterBottomSheetTheme;
}

export function FilterBottomSheet({
  visible,
  filters,
  activeValues = {},
  onClose,
  onApply,
  onReset,
  title = 'Filter Records',
  applyText = 'Apply Filters',
  resetText = 'Reset All',
  theme = {},
}: FilterBottomSheetProps) {
  const primaryColor = theme.primaryColor || '#4F46E5';
  const surfaceColor = theme.surfaceColor || '#FFFFFF';
  const textColor = theme.textColor || '#0F172A';
  const textMutedColor = theme.textMutedColor || '#64748B';
  const borderColor = theme.borderColor || '#E2E8F0';

  const [draftValues, setDraftValues] = useState<Record<string, unknown>>(activeValues);

  useEffect(() => {
    setDraftValues(activeValues);
  }, [activeValues, visible]);

  const handleSelectOption = (filterKey: string, optionValue: unknown, isMulti?: boolean) => {
    setDraftValues((prev) => {
      if (isMulti) {
        const currentList = Array.isArray(prev[filterKey]) ? [...(prev[filterKey] as unknown[])] : [];
        const exists = currentList.includes(optionValue);
        const nextList = exists
          ? currentList.filter((v) => v !== optionValue)
          : [...currentList, optionValue];
        return { ...prev, [filterKey]: nextList };
      }
      return { ...prev, [filterKey]: optionValue };
    });
  };

  const handleToggleBoolean = (filterKey: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }));
  };

  const handleTextChange = (filterKey: string, text: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [filterKey]: text,
    }));
  };

  const handleReset = () => {
    setDraftValues({});
    onReset?.();
  };

  const handleApply = () => {
    onApply?.(draftValues);
    onClose();
  };

  const activeCount = Object.keys(draftValues).filter((k) => {
    const val = draftValues[k];
    if (val === null || val === undefined || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheetContainer, { backgroundColor: surfaceColor }]}>
          {/* Top Drag Handle */}
          <View style={styles.dragHandleWrap}>
            <View style={[styles.dragHandle, { backgroundColor: borderColor }]} />
          </View>

          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: borderColor }]}>
            <View>
              <Text style={[styles.title, { color: textColor }]}>{title}</Text>
              {activeCount > 0 && (
                <Text style={[styles.activeSubtext, { color: primaryColor }]}>
                  {activeCount} active filter{activeCount > 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <Text style={[styles.resetText, { color: textMutedColor }]}>{resetText}</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Dimensions List */}
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {filters.map((filter) => {
              const currentValue = draftValues[filter.key];

              return (
                <View key={filter.key} style={[styles.filterGroup, { borderBottomColor: borderColor }]}>
                  <Text style={[styles.filterLabel, { color: textColor }]}>{filter.label}</Text>

                  {/* SELECT / FACET / MULTI_SELECT */}
                  {(filter.type === 'SELECT' || filter.type === 'FACET' || filter.type === 'MULTI_SELECT') &&
                    filter.options && (
                      <View style={styles.optionsWrap}>
                        {filter.options.map((opt) => {
                          const isSelected = filter.type === 'MULTI_SELECT'
                            ? Array.isArray(currentValue) && (currentValue as unknown[]).includes(opt.value)
                            : currentValue === opt.value;

                          return (
                            <TouchableOpacity
                              key={String(opt.value)}
                              style={[
                                styles.optionPill,
                                {
                                  borderColor: isSelected ? primaryColor : borderColor,
                                  backgroundColor: isSelected ? primaryColor : 'transparent',
                                },
                              ]}
                              onPress={() =>
                                handleSelectOption(filter.key, opt.value, filter.type === 'MULTI_SELECT')
                              }
                            >
                              <Text
                                style={[
                                  styles.optionPillText,
                                  { color: isSelected ? '#FFFFFF' : textColor },
                                ]}
                              >
                                {opt.label}
                                {opt.count != null ? ` (${opt.count})` : ''}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                  {/* DATE_RANGE Quick Presets */}
                  {filter.type === 'DATE_RANGE' && (
                    <View style={styles.optionsWrap}>
                      {[
                        { label: 'Today', value: 'TODAY' },
                        { label: 'Yesterday', value: 'YESTERDAY' },
                        { label: 'Last 7 Days', value: '7D' },
                        { label: 'Last 30 Days', value: '30D' },
                        { label: 'All Time', value: 'ALL' },
                      ].map((preset) => {
                        const isSelected = currentValue === preset.value;
                        return (
                          <TouchableOpacity
                            key={preset.value}
                            style={[
                              styles.optionPill,
                              {
                                borderColor: isSelected ? primaryColor : borderColor,
                                backgroundColor: isSelected ? primaryColor : 'transparent',
                              },
                            ]}
                            onPress={() => handleSelectOption(filter.key, preset.value)}
                          >
                            <Text
                              style={[
                                styles.optionPillText,
                                { color: isSelected ? '#FFFFFF' : textColor },
                              ]}
                            >
                              {preset.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* BOOLEAN SWITCH */}
                  {filter.type === 'BOOLEAN' && (
                    <View style={styles.booleanRow}>
                      <Text style={[styles.booleanLabel, { color: textMutedColor }]}>
                        {currentValue ? 'Enabled' : 'Disabled'}
                      </Text>
                      <Switch
                        value={Boolean(currentValue)}
                        onValueChange={() => handleToggleBoolean(filter.key)}
                        trackColor={{ true: primaryColor, false: borderColor }}
                      />
                    </View>
                  )}

                  {/* SEARCH QUERY INPUT */}
                  {filter.type === 'SEARCH' && (
                    <TextInput
                      style={[styles.searchInput, { borderColor, color: textColor }]}
                      placeholder={filter.placeholder || `Search ${filter.label}...`}
                      placeholderTextColor={textMutedColor}
                      value={typeof currentValue === 'string' ? currentValue : ''}
                      onChangeText={(t: string) => handleTextChange(filter.key, t)}
                    />
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footerRow, { borderTopColor: borderColor }]}>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor }]}>
              <Text style={[styles.closeBtnText, { color: textColor }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleApply}
              style={[styles.applyBtn, { backgroundColor: primaryColor }]}
            >
              <Text style={styles.applyBtnText}>
                {applyText} {activeCount > 0 ? `(${activeCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  activeSubtext: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  resetBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollArea: {
    maxHeight: 420,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  filterGroup: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  booleanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  booleanLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  closeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  applyBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

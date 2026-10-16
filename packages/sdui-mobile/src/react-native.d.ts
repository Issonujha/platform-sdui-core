declare module 'react-native' {
  import React from 'react';

  export type ViewStyle = any;
  export type TextStyle = any;

  export interface ViewProps {
    style?: any;
    children?: React.ReactNode;
    [key: string]: any;
  }
  export const View: React.FC<ViewProps>;

  export interface TextProps {
    style?: any;
    numberOfLines?: number;
    children?: React.ReactNode;
    [key: string]: any;
  }
  export const Text: React.FC<TextProps>;

  export interface TouchableOpacityProps {
    style?: any;
    onPress?: () => void;
    activeOpacity?: number;
    hitSlop?: any;
    children?: React.ReactNode;
    [key: string]: any;
  }
  export const TouchableOpacity: React.FC<TouchableOpacityProps>;

  export interface FlatListProps<T> {
    data: T[] | readonly T[] | null | undefined;
    renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement | null;
    keyExtractor?: (item: T, index: number) => string;
    refreshControl?: React.ReactElement;
    onEndReached?: () => void;
    onEndReachedThreshold?: number;
    ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
    contentContainerStyle?: any;
    style?: any;
    [key: string]: any;
  }
  export const FlatList: <T>(props: FlatListProps<T>) => React.ReactElement | null;

  export interface RefreshControlProps {
    refreshing: boolean;
    onRefresh?: () => void;
    tintColor?: string;
    colors?: string[];
    [key: string]: any;
  }
  export const RefreshControl: React.FC<RefreshControlProps>;

  export interface ScrollViewProps {
    style?: any;
    contentContainerStyle?: any;
    children?: React.ReactNode;
    [key: string]: any;
  }
  export const ScrollView: React.FC<ScrollViewProps>;

  export interface ModalProps {
    visible?: boolean;
    transparent?: boolean;
    animationType?: 'none' | 'slide' | 'fade';
    onRequestClose?: () => void;
    children?: React.ReactNode;
    [key: string]: any;
  }
  export const Modal: React.FC<ModalProps>;
}

import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Pressable,
  useColorScheme,
} from 'react-native';
import { Theme } from 'tamagui';
import { useAppStore } from '@/shared/lib/stores/app-store';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const panY = useRef(new Animated.Value(0)).current;
  const currentTheme = useAppStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const isDark =
    currentTheme === 'system' ? systemScheme === 'dark' : currentTheme === 'dark';

  useEffect(() => {
    if (visible) {
      panY.setValue(400);
      Animated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 9,
      }).start();
    }
  }, [visible, panY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture gesture if moving downwards by a significant margin
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Theme name={isDark ? 'dark' : 'light'}>
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.sheetContainer,
              {
                backgroundColor: isDark ? '#161616' : '#ffffff',
                transform: [{ translateY: panY }],
              },
            ]}
          >
            {/* Internal pressable prevents backdrop press from firing inside the sheet */}
            <Pressable style={styles.sheetContent} onPress={(e) => e.stopPropagation()}>
              {/* Drag Handle Indicator */}
              <View style={styles.dragHandleArea}>
                <View style={styles.dragHandle} />
              </View>
              {children}
            </Pressable>
          </Animated.View>
        </Theme>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
  },
  sheetContent: {
    width: '100%',
    paddingHorizontal: 24,
  },
  dragHandleArea: {
    width: '100%',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(128, 128, 128, 0.4)',
  },
});

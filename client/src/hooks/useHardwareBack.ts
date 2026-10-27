import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

export function useHardwareBack(handler: () => boolean) {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [handler]);
}

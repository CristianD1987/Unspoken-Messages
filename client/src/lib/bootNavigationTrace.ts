import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';

const BOOT_TRACE_MS = 8000;

const noopTracer = {
  onMount: () => {},
  onReady: () => {},
  onStateChange: () => {},
};

export function createBootNavigationTracer(
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>
) {
  if (!__DEV__) {
    return noopTracer;
  }

  const until = Date.now() + BOOT_TRACE_MS;
  let readyLogged = false;

  const log = (event: string, detail?: unknown) => {
    if (Date.now() > until) return;
    const route = navigationRef.getCurrentRoute();
    console.log(
      `[boot nav] ${event}`,
      route ? { name: route.name, params: route.params } : '(no route)',
      detail ?? ''
    );
  };

  return {
    onMount: () => log('NavigationContainer mount'),
    onReady: () => {
      if (readyLogged) return;
      readyLogged = true;
      log('NavigationContainer onReady');
    },
    onStateChange: () => log('onStateChange'),
  };
}

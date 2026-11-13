import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useIAP, isUserCancelledError, type Product } from 'expo-iap';
import { TIP_PRODUCT_IDS, isTipProductId } from '@/lib/tips';

/** idle → purchasing → thanks | error. */
export type TipStatus = 'idle' | 'purchasing' | 'thanks' | 'error';

type TipJarContextValue = {
  /** True only when the store connected and returned at least one tip product. */
  available: boolean;
  /** True until the first product request has finished (or failed). */
  loading: boolean;
  /** Tip products sorted by price, cheapest first. Prices come from the store. */
  tips: Product[];
  status: TipStatus;
  purchase: (sku: string) => void;
  resetStatus: () => void;
};

const unavailable: TipJarContextValue = {
  available: false,
  loading: false,
  tips: [],
  status: 'idle',
  purchase: () => {},
  resetStatus: () => {},
};

const TipJarContext = createContext<TipJarContextValue>(unavailable);

function StoreTipJarProvider({ children }: { children: React.ReactNode }) {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [status, setStatus] = useState<TipStatus>('idle');
  // Only show "thank you" for a purchase the user started in this session,
  // not for an unfinished transaction the store re-delivers on launch.
  const userInitiated = useRef(false);

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      if (purchase.purchaseState === 'pending') return;
      try {
        await finishTransaction({ purchase, isConsumable: true });
      } catch {
        // The store re-delivers unfinished transactions; it will be finished next time.
      }
      if (userInitiated.current && isTipProductId(purchase.productId)) {
        userInitiated.current = false;
        setStatus('thanks');
      }
    },
    onPurchaseError: (error) => {
      const wasUserInitiated = userInitiated.current;
      userInitiated.current = false;
      if (!wasUserInitiated) return;
      setStatus(isUserCancelledError(error) ? 'idle' : 'error');
    },
  });

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    fetchProducts({ skus: [...TIP_PRODUCT_IDS], type: 'in-app' })
      .then(() => {
        if (!cancelled) setLoadState('loaded');
      })
      .catch(() => {
        if (!cancelled) setLoadState('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [connected, fetchProducts]);

  const tips = useMemo(
    () =>
      products
        .filter((p) => isTipProductId(p.id))
        .sort((a, b) => (a.price ?? 0) - (b.price ?? 0)),
    [products]
  );

  const purchase = useCallback(
    (sku: string) => {
      if (!isTipProductId(sku)) return;
      userInitiated.current = true;
      setStatus('purchasing');
      Promise.resolve(
        requestPurchase({
          request: { apple: { sku }, google: { skus: [sku] } },
          type: 'in-app',
        })
      ).catch((error: unknown) => {
        // Synchronous rejections (e.g. store not ready) do not always reach onPurchaseError.
        if (!userInitiated.current) return;
        userInitiated.current = false;
        setStatus(isUserCancelledError(error as never) ? 'idle' : 'error');
      });
    },
    [requestPurchase]
  );

  const resetStatus = useCallback(() => setStatus('idle'), []);

  const value = useMemo<TipJarContextValue>(
    () => ({
      available: loadState === 'loaded' && tips.length > 0,
      loading: loadState === 'loading',
      tips,
      status,
      purchase,
      resetStatus,
    }),
    [loadState, tips, status, purchase, resetStatus]
  );

  return <TipJarContext.Provider value={value}>{children}</TipJarContext.Provider>;
}

export function TipJarProvider({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return <TipJarContext.Provider value={unavailable}>{children}</TipJarContext.Provider>;
  }
  return <StoreTipJarProvider>{children}</StoreTipJarProvider>;
}

export function useTipJar() {
  return useContext(TipJarContext);
}

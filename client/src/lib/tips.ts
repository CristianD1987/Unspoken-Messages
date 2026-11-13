/**
 * Consumable "tip jar" products. The same IDs are used on the App Store and Google Play.
 * If a store has no matching products, the tip entry points stay hidden.
 */
export const TIP_PRODUCT_IDS = [
  'com.fofensoft.unspoken.tip.small',
  'com.fofensoft.unspoken.tip.medium',
  'com.fofensoft.unspoken.tip.large',
] as const;

export type TipProductId = (typeof TIP_PRODUCT_IDS)[number];

export function isTipProductId(id: string): id is TipProductId {
  return (TIP_PRODUCT_IDS as readonly string[]).includes(id);
}

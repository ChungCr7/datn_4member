export type MarketplaceRole = 'BUYER' | 'SELLER' | 'ADMIN';

export function toMarketplaceRole(role?: string | null): MarketplaceRole {
  const normalized = String(role || '')
    .trim()
    .toUpperCase();
  if (normalized === 'SELLER') return 'SELLER';
  if (normalized === 'ADMIN' || normalized === 'ROOT') return 'ADMIN';
  return 'BUYER';
}

export function normalizeGuardRole(role?: string | null) {
  const normalized = String(role || '')
    .trim()
    .toLowerCase();
  if (normalized === 'user') return 'buyer';
  if (normalized === 'buyer') return 'buyer';
  if (normalized === 'seller') return 'seller';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'root') return 'root';
  return normalized;
}

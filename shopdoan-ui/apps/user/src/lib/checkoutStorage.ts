import { Product } from '@/services/marketplaceService';

export type CheckoutAddress = {
  id: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  isDefault?: boolean;
};

export type BuyNowItem = {
  id: string;
  productId: number;
  variantId?: number;
  variantName?: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  seller?: Product['seller'];
};

const ADDRESSES_KEY = 'shopdoan_addresses';
const SELECTED_ADDRESS_KEY = 'shopdoan_selected_address';
const BUY_NOW_KEY = 'shopdoan_buy_now';

export function readAddresses() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(ADDRESSES_KEY) || '[]') as CheckoutAddress[];
  } catch {
    return [];
  }
}

export function writeAddresses(addresses: CheckoutAddress[]) {
  window.localStorage.setItem(ADDRESSES_KEY, JSON.stringify(addresses));
}

export function readSelectedAddress() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SELECTED_ADDRESS_KEY);
    return raw ? (JSON.parse(raw) as CheckoutAddress) : null;
  } catch {
    return null;
  }
}

export function writeSelectedAddress(address: CheckoutAddress) {
  window.localStorage.setItem(SELECTED_ADDRESS_KEY, JSON.stringify(address));
}

export function readBuyNowItem() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(BUY_NOW_KEY);
    return raw ? (JSON.parse(raw) as BuyNowItem) : null;
  } catch {
    return null;
  }
}

export function writeBuyNowItem(item: BuyNowItem) {
  window.sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(item));
}

export function clearBuyNowItem() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(BUY_NOW_KEY);
}

import { post } from '@/utils/httpRequest';

export const createStripeCheckout = (accessToken: string, orderId: number) =>
  post<{ checkoutUrl: string; sessionId: string }>(
    '/payments/stripe/checkout',
    { orderId },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

export const confirmStripeCheckout = (accessToken: string, sessionId: string) =>
  post<{ paid: boolean; order: any }>(
    '/payments/stripe/confirm',
    { sessionId },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

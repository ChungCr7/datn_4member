import { get, post } from '@/utils/httpRequest';
import { AxiosRequestConfig } from 'axios';

export const getConversations = async (accessToken: string) => {
  const config: AxiosRequestConfig = {
    headers: { Authorization: `Bearer ${accessToken}` },
  };
  const response = await get('/chatbot/conversations', config);
  return normalizeConversations(response);
};

export const getConversation = async (conversationId: number | string, accessToken: string) => {
  const config: AxiosRequestConfig = {
    headers: { Authorization: `Bearer ${accessToken}` },
  };
  const response = await get(`/chatbot/conversations/${conversationId}`, config);
  return normalizeConversation(response);
};

export const sendReply = async (conversationId: number | string, text: string, accessToken: string) => {
  const config: AxiosRequestConfig = {
    headers: { Authorization: `Bearer ${accessToken}` },
  };
  return post(`/chatbot/conversations/${conversationId}/reply`, { text }, config);
};

export function normalizeConversations(response: any): any[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.conversations)) return response.conversations;
  if (Array.isArray(response?.data?.conversations)) return response.data.conversations;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

export function normalizeConversation(response: any): any {
  return response?.data?.conversation || response?.conversation || response?.data || response || null;
}

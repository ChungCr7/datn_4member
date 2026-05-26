import { get, post } from '@/utils/httpRequest';
import { AxiosRequestConfig } from 'axios';

export const getConversations = async (accessToken: string) => {
  const config: AxiosRequestConfig = {
    headers: { Authorization: `Bearer ${accessToken}` },
  };
  return get('/chatbot/conversations', config);
};

export const getConversation = async (conversationId: number | string, accessToken: string) => {
  const config: AxiosRequestConfig = {
    headers: { Authorization: `Bearer ${accessToken}` },
  };
  return get(`/chatbot/conversations/${conversationId}`, config);
};

export const sendReply = async (conversationId: number | string, text: string, accessToken: string) => {
  const config: AxiosRequestConfig = {
    headers: { Authorization: `Bearer ${accessToken}` },
  };
  return post(`/chatbot/conversations/${conversationId}/reply`, { text }, config);
};

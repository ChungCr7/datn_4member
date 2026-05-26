import { get, post } from '@/utils/httpRequest';
import { AxiosRequestConfig } from 'axios';

const authConfig = (accessToken: string): AxiosRequestConfig => ({
  headers: { Authorization: `Bearer ${accessToken}` },
});

export const fetchConversationMessages = async (accessToken: string) => {
  return get<{ messages: any[]; conversationId: number }>('/chatbot/conversations/me', authConfig(accessToken));
};

export const sendChatbotMessage = async (message: string, accessToken: string) => {
  return post<{ response: string; conversationId: number; suggestions?: any[]; cartAction?: any; quickReplies?: string[] }>('/chatbot/message', { message }, authConfig(accessToken));
};

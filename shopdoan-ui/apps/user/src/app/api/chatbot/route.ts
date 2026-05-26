import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { fetchConversationMessages, sendChatbotMessage } from '@/services/chatbotService';

async function getAccessToken(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  return token?.accessToken as string | undefined;
}

export async function GET(request: NextRequest) {
  const accessToken = await getAccessToken(request);
  if (!accessToken) return NextResponse.json({ messages: [] }, { status: 401 });

  try {
    const data = await fetchConversationMessages(accessToken);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Chat history error:', error);
    return NextResponse.json({ messages: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Authentication required' }, { status: 401 });

  try {
    const { message } = await request.json();
    const data = await sendChatbotMessage(message, accessToken);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json({ message: 'Chatbot API error' }, { status: 500 });
  }
}

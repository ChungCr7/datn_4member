import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatbotService } from './chatbot.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

type SendMessagePayload = {
  message: string;
};

type SellerReplyPayload = {
  conversationId: number;
  text: string;
};

type ChatSocketData = {
  userId?: number;
  role?: string;
};

type ChatSocket = Socket & {
  data: ChatSocketData;
};

type SocketAuth = {
  userId: number;
  role?: string;
};

@WebSocketGateway({
  namespace: 'chatbot',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatbotGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: ChatSocket) {
    const auth = await this.resolveAuth(client);
    if (!auth) {
      client.emit('chat_error', { message: 'Authentication required' });
      client.disconnect(true);
      return;
    }

    const data = this.getSocketData(client);
    data.userId = auth.userId;
    data.role = auth.role;
    client.emit('connected', { socketId: client.id });
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(@ConnectedSocket() client: ChatSocket) {
    const userId = this.getUserId(client);
    if (!userId) return this.rejectUnauthenticated(client);

    const conversation = await this.chatbotService.getUserConversation(userId);
    await client.join(this.conversationRoom(conversation.conversationId));
    client.emit('conversation_joined', conversation);
    client.emit('session_joined', conversation);
    return conversation;
  }

  @SubscribeMessage('join_session')
  async handleLegacyJoinSession(@ConnectedSocket() client: ChatSocket) {
    return this.handleJoinConversation(client);
  }

  @SubscribeMessage('seller_join')
  async handleSellerJoin(@ConnectedSocket() client: ChatSocket) {
    if (!this.isSellerSupport(client)) {
      client.emit('chat_error', { message: 'Seller permission required' });
      return;
    }
    await client.join('sellers');
    client.emit('conversations', await this.chatbotService.getConversations());
  }

  @SubscribeMessage('seller_join_conversation')
  async handleSellerJoinConversation(
    @MessageBody() payload: { conversationId: number },
    @ConnectedSocket() client: ChatSocket,
  ) {
    if (!this.isSellerSupport(client)) {
      client.emit('chat_error', { message: 'Seller permission required' });
      return;
    }

    const conversationId = Number(payload.conversationId);
    const conversation =
      await this.chatbotService.getAdminConversation(conversationId);
    await client.join(this.conversationRoom(conversationId));
    client.emit('conversation', conversation);
    client.emit('conversations', await this.chatbotService.getConversations());
    return conversation;
  }

  @SubscribeMessage('seller_join_session')
  async handleLegacySellerJoinSession(
    @MessageBody() payload: { sessionId: string; conversationId?: number },
    @ConnectedSocket() client: ChatSocket,
  ) {
    return this.handleSellerJoinConversation(
      { conversationId: Number(payload.conversationId || payload.sessionId) },
      client,
    );
  }

  @SubscribeMessage('user_message')
  async handleUserMessage(
    @MessageBody() payload: SendMessagePayload,
    @ConnectedSocket() client: ChatSocket,
  ) {
    const userId = this.getUserId(client);
    if (!userId) return this.rejectUnauthenticated(client);

    const result = await this.chatbotService.sendMessage(
      payload.message,
      userId,
    );
    const room = this.conversationRoom(result.conversationId);
    await client.join(room);

    const latestMessage =
      result.conversation.messages[result.conversation.messages.length - 1];

    this.server.to(room).emit('new-message', {
      conversationId: result.conversationId,
      message: latestMessage,
      conversation: result.conversation,
      response: result.response,
      suggestions: result.suggestions,
      cartAction: result.cartAction,
      ai: result.ai,
    });

    client.emit('bot_message', {
      response: result.response,
      conversationId: result.conversationId,
      message: latestMessage,
      suggestions: result.suggestions,
      cartAction: result.cartAction,
      ai: result.ai,
      conversation: result.conversation,
    });

    this.server.to('sellers').emit('conversation_updated', {
      conversation: result.conversation,
      conversations: await this.chatbotService.getConversations(),
    });

    return result;
  }

  @SubscribeMessage('seller_reply')
  async handleSellerReply(
    @MessageBody() payload: SellerReplyPayload,
    @ConnectedSocket() client: ChatSocket,
  ) {
    if (!this.isSellerSupport(client)) {
      client.emit('chat_error', { message: 'Seller permission required' });
      return;
    }

    const conversationId = Number(payload.conversationId);
    const sellerId = this.getUserId(client);
    if (!sellerId) return this.rejectUnauthenticated(client);

    const conversation = await this.chatbotService.addSellerReply(
      conversationId,
      sellerId,
      payload.text,
    );
    const latestMessage =
      conversation.messages[conversation.messages.length - 1];

    this.server.to(this.conversationRoom(conversationId)).emit('new-message', {
      conversationId,
      message: latestMessage,
      conversation,
    });

    this.server
      .to(this.conversationRoom(conversationId))
      .emit('seller_message', {
        conversationId,
        message: latestMessage,
        conversation,
      });

    this.server.to('sellers').emit('conversation_updated', {
      conversation,
      conversations: await this.chatbotService.getConversations(),
    });

    return conversation;
  }

  private conversationRoom(conversationId: number) {
    return `conversation-${conversationId}`;
  }

  private rejectUnauthenticated(client: ChatSocket) {
    client.emit('chat_error', { message: 'Authentication required' });
    return undefined;
  }

  private getUserId(client: ChatSocket): number | undefined {
    return this.getSocketData(client).userId;
  }

  private isSellerSupport(client: ChatSocket) {
    const role = String(this.getSocketData(client).role || '').toLowerCase();
    return role === 'seller' || role === 'root' || role === 'admin';
  }

  private getSocketData(client: ChatSocket): ChatSocketData {
    return client.data as ChatSocketData;
  }

  private async resolveAuth(
    client: ChatSocket,
  ): Promise<SocketAuth | undefined> {
    const handshakeAuth = client.handshake.auth as
      | { token?: string }
      | undefined;
    const rawToken =
      handshakeAuth?.token ||
      String(client.handshake.headers.authorization || '').replace(
        /^Bearer\s+/i,
        '',
      );
    if (!rawToken) return undefined;

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        role?: string;
      }>(rawToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return { userId: payload.sub, role: payload.role };
    } catch {
      return undefined;
    }
  }
}

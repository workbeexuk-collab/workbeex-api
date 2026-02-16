import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from './messages.service';
import { Logger } from '@nestjs/common';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure for production
  },
  namespace: '/ws',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds

  constructor(
    private messagesService: MessagesService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      // Get token from handshake
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        socket.disconnect();
        return;
      }

      // Verify token
      const payload = this.jwtService.verify(token as string, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      const userId = payload.sub as string;
      socket.userId = userId;

      // Track user's sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Join user's room
      socket.join(`user:${userId}`);

      this.logger.log(`Client connected: ${socket.id} (User: ${userId})`);

      // Send unread count
      const unreadCount = await this.messagesService.getUnreadCount(userId);
      socket.emit('unread_count', { count: unreadCount });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.userId) {
      const sockets = this.userSockets.get(socket.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          this.userSockets.delete(socket.userId);
        }
      }
    }
    this.logger.log(`Client disconnected: ${socket.id}`);
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!socket.userId) return;

    socket.join(`conversation:${data.conversationId}`);
    this.logger.log(`User ${socket.userId} joined conversation ${data.conversationId}`);
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    socket.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string; type?: string },
  ) {
    if (!socket.userId) return;

    try {
      const message = await this.messagesService.sendMessage(
        socket.userId,
        data.conversationId,
        data.content,
        (data.type as any) || 'TEXT',
      );

      // Emit to all participants in the conversation (for real-time chat)
      this.server.to(`conversation:${data.conversationId}`).emit('new_message', message);

      // Send notification to the OTHER user (not the sender)
      const otherUserId = await this.messagesService.getOtherParticipant(
        data.conversationId,
        socket.userId,
      );

      if (otherUserId) {
        this.server.to(`user:${otherUserId}`).emit('message_notification', {
          conversationId: data.conversationId,
          message,
        });
      }

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Send message error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    if (!socket.userId) return;

    socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
      userId: socket.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!socket.userId) return;

    await this.messagesService.markAsRead(socket.userId, data.conversationId);

    // Update unread count
    const unreadCount = await this.messagesService.getUnreadCount(socket.userId);
    socket.emit('unread_count', { count: unreadCount });
  }

  // Helper to check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  // Helper to send notification to specific user
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}

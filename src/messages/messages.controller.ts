import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';

interface AuthUser {
  id: string;
  email: string;
  type: string;
}

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  // Get all conversations
  @Get('conversations')
  async getConversations(@CurrentUser() user: AuthUser) {
    const conversations = await this.messagesService.getConversations(user.id);
    return {
      success: true,
      data: conversations,
    };
  }

  // Start conversation with provider
  @Post('conversations/provider/:providerId')
  async startConversationWithProvider(
    @CurrentUser() user: AuthUser,
    @Param('providerId') providerId: string,
  ) {
    const conversation = await this.messagesService.startConversationWithProvider(
      user.id,
      providerId,
    );
    return {
      success: true,
      data: conversation,
    };
  }

  // Get messages in conversation
  @Get('conversations/:conversationId')
  async getMessages(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const messages = await this.messagesService.getMessages(
      user.id,
      conversationId,
      limit ? parseInt(limit) : 50,
      before,
    );
    return {
      success: true,
      data: messages,
    };
  }

  // Send message (HTTP fallback, prefer WebSocket)
  @Post('conversations/:conversationId/messages')
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() body: { content: string; type?: string },
  ) {
    const message = await this.messagesService.sendMessage(
      user.id,
      conversationId,
      body.content,
      (body.type as any) || 'TEXT',
    );
    return {
      success: true,
      data: message,
    };
  }

  // Mark conversation as read
  @Post('conversations/:conversationId/read')
  async markAsRead(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
  ) {
    await this.messagesService.markAsRead(user.id, conversationId);
    return {
      success: true,
    };
  }

  // Get unread count
  @Get('unread')
  async getUnreadCount(@CurrentUser() user: AuthUser) {
    const count = await this.messagesService.getUnreadCount(user.id);
    return {
      success: true,
      data: { count },
    };
  }

  // Archive conversation
  @Post('conversations/:conversationId/archive')
  async archiveConversation(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
  ) {
    await this.messagesService.archiveConversation(user.id, conversationId);
    return {
      success: true,
    };
  }
}

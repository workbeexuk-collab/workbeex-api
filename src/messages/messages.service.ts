import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // Get or create conversation between two users
  async getOrCreateConversation(userId1: string, userId2: string) {
    // Check if conversation exists
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: userId1 } } },
          { participants: { some: { userId: userId2 } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    return this.prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: userId1 }, { userId: userId2 }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  }

  // Get user's conversations
  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId, isArchived: false },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return conversations.map((conv) => {
      const otherParticipant = conv.participants.find((p) => p.userId !== userId);
      const myParticipant = conv.participants.find((p) => p.userId === userId);
      const lastMessage = conv.messages[0];

      return {
        id: conv.id,
        otherUser: otherParticipant?.user,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              type: lastMessage.type,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount: 0, // Will calculate separately
        lastMessageAt: conv.lastMessageAt,
        lastReadAt: myParticipant?.lastReadAt,
      };
    });
  }

  // Get messages in a conversation
  async getMessages(userId: string, conversationId: string, limit = 50, before?: string) {
    // Verify user is participant
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(before && { createdAt: { lt: new Date(before) } }),
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }

  // Send a message
  async sendMessage(
    senderId: string,
    conversationId: string,
    content: string,
    type: MessageType = 'TEXT',
    attachments: string[] = [],
  ) {
    // Verify sender is participant
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: senderId },
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        type,
        attachments,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Update conversation's lastMessageAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    return message;
  }

  // Mark messages as read
  async markAsRead(userId: string, conversationId: string) {
    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { lastReadAt: new Date() },
    });

    return { success: true };
  }

  // Get unread count for user
  async getUnreadCount(userId: string): Promise<number> {
    const conversations = await this.prisma.conversationParticipant.findMany({
      where: { userId, isArchived: false },
      include: {
        conversation: {
          include: {
            messages: {
              where: {
                senderId: { not: userId },
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    let unreadCount = 0;
    for (const cp of conversations) {
      const lastMessage = cp.conversation.messages[0];
      if (lastMessage && (!cp.lastReadAt || lastMessage.createdAt > cp.lastReadAt)) {
        unreadCount++;
      }
    }

    return unreadCount;
  }

  // Archive conversation
  async archiveConversation(userId: string, conversationId: string) {
    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { isArchived: true },
    });

    return { success: true };
  }

  // Get the other participant in a conversation
  async getOtherParticipant(conversationId: string, currentUserId: string): Promise<string | null> {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: { not: currentUserId },
      },
    });

    return participant?.userId || null;
  }

  // Start conversation with provider
  async startConversationWithProvider(userId: string, providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return this.getOrCreateConversation(userId, provider.userId);
  }
}

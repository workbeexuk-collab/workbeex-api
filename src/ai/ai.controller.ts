import { Controller, Post, Get, Delete, Patch, Body, Query, Param } from '@nestjs/common';
import { AiService, ChatResponse } from './ai.service';
import {
  ChatRequestDto,
  TextToSpeechRequestDto,
  TextToSpeechResponseDto,
  SpeechToTextRequestDto,
  SpeechToTextResponseDto,
  ImageAnalysisRequestDto,
  ImageAnalysisResponseDto,
} from './dto/chat.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Public()
  @Post('chat')
  async chat(@Body() chatRequest: ChatRequestDto): Promise<ChatResponse> {
    return this.aiService.chat(
      chatRequest.message,
      chatRequest.history || [],
      chatRequest.sessionId,
      chatRequest.userId,
      chatRequest.isLoggedIn,
      chatRequest.locale || 'en',
      chatRequest.conversationId,
      chatRequest.latitude,
      chatRequest.longitude,
    );
  }

  @Public()
  @Post('voice-chat')
  async voiceChat(@Body() chatRequest: ChatRequestDto): Promise<{ text: string; audio: string | null; intent: ChatResponse }> {
    return this.aiService.voiceChat(
      chatRequest.message,
      chatRequest.history || [],
      chatRequest.sessionId,
      chatRequest.userId,
      chatRequest.isLoggedIn,
      chatRequest.locale || 'en',
      chatRequest.conversationId,
    );
  }

  @Public()
  @Post('voice-chat-audio')
  async voiceChatAudio(@Body() body: {
    audio: string;
    mimeType?: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
    sessionId?: string;
    userId?: string;
    isLoggedIn?: boolean;
    locale?: string;
    conversationId?: string;
  }) {
    return this.aiService.voiceChatAudio(
      body.audio,
      body.mimeType || 'audio/webm',
      body.history || [],
      body.sessionId,
      body.userId,
      body.isLoggedIn,
      body.locale,
      body.conversationId,
    );
  }

  @Public()
  @Post('tts')
  async textToSpeech(@Body() request: TextToSpeechRequestDto): Promise<TextToSpeechResponseDto> {
    const audio = await this.aiService.textToSpeech(request.text, request.voiceName);
    return { audio };
  }

  @Public()
  @Post('stt')
  async speechToText(@Body() request: SpeechToTextRequestDto): Promise<SpeechToTextResponseDto> {
    const text = await this.aiService.speechToText(request.audio, request.mimeType);
    return { text, success: !!text };
  }

  @Public()
  @Post('analyze-image')
  async analyzeImage(@Body() request: ImageAnalysisRequestDto): Promise<ImageAnalysisResponseDto> {
    const result = await this.aiService.analyzeImage(
      request.image,
      request.mimeType || 'image/jpeg',
      request.locale || 'en',
    );
    return { ...result, success: !!result.serviceKey };
  }

  @Public()
  @Post('upload-avatar')
  async uploadAvatar(@Body() body: { imageBase64: string; userId: string }) {
    return this.aiService.uploadAvatar(body.imageBase64, body.userId);
  }

  @Public()
  @Get('welcome')
  getWelcome(@Query('locale') locale?: string): ChatResponse {
    return this.aiService.getWelcomeMessage(locale || 'en');
  }

  // ===== Conversation CRUD =====

  @Public()
  @Get('conversations')
  async getConversations(@Query('userId') userId: string, @Query('limit') limit?: string) {
    if (!userId) return [];
    return this.aiService.getConversations(userId, limit ? parseInt(limit) : 30);
  }

  @Public()
  @Get('conversations/:id')
  async getConversation(@Param('id') id: string) {
    return this.aiService.getConversation(id);
  }

  @Public()
  @Delete('conversations/:id')
  async deleteConversation(@Param('id') id: string) {
    await this.aiService.deleteConversation(id);
    return { success: true };
  }

  @Public()
  @Patch('conversations/:id')
  async renameConversation(@Param('id') id: string, @Body() body: { title: string }) {
    await this.aiService.renameConversation(id, body.title);
    return { success: true };
  }
}

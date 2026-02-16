import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { AiService } from './ai.service';
import {
  ChatRequestDto,
  AIResponseDto,
  ServiceIntentResponseDto,
  VoiceChatResponseDto,
  TextToSpeechRequestDto,
  TextToSpeechResponseDto,
  SpeechToTextRequestDto,
  SpeechToTextResponseDto,
  ImageAnalysisRequestDto,
  ImageAnalysisResponseDto,
  CVChatRequestDto,
  CVChatResponseDto,
} from './dto/chat.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // New comprehensive chat endpoint
  @Public()
  @Post('chat')
  async chat(@Body() chatRequest: ChatRequestDto): Promise<AIResponseDto> {
    return this.aiService.chat(
      chatRequest.message,
      chatRequest.history || [],
      chatRequest.sessionId,
      chatRequest.userId,
      chatRequest.isLoggedIn,
      chatRequest.locale || 'en',
    );
  }

  // Legacy endpoint for backwards compatibility
  @Public()
  @Post('chat/legacy')
  async chatLegacy(@Body() chatRequest: ChatRequestDto): Promise<ServiceIntentResponseDto> {
    return this.aiService.analyzeUserIntent(chatRequest.message, chatRequest.history || []);
  }

  @Public()
  @Post('voice-chat')
  async voiceChat(@Body() chatRequest: ChatRequestDto): Promise<VoiceChatResponseDto> {
    return this.aiService.voiceChat(
      chatRequest.message,
      chatRequest.history || [],
      chatRequest.sessionId,
      chatRequest.userId,
      chatRequest.isLoggedIn,
      chatRequest.locale || 'en',
    );
  }

  @Public()
  @Post('tts')
  async textToSpeech(@Body() request: TextToSpeechRequestDto): Promise<TextToSpeechResponseDto> {
    const audio = await this.aiService.textToSpeech(request.text);
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
      request.locale || 'en'
    );
    return { ...result, success: !!result.serviceKey };
  }

  @Public()
  @Get('welcome')
  getWelcome(@Query('locale') locale?: string): AIResponseDto {
    return this.aiService.getWelcomeMessage(locale || 'en');
  }

  // CV Builder AI Chat
  @Public()
  @Post('cv-chat')
  async cvChat(@Body() request: CVChatRequestDto): Promise<CVChatResponseDto> {
    return this.aiService.cvChat(
      request.message,
      request.conversationHistory || [],
      request.currentCvData,
      request.userInfo || null,
      request.locale || 'en',
    );
  }
}

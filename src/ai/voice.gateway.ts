import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Modality, Type as GenAIType } from '@google/genai';
import { AiService } from './ai.service';

// Tool declarations (same as in ai.service but simplified for voice)
const voiceToolDeclarations = [
  {
    name: 'search_jobs',
    description: 'Search for job listings when user is looking for work.',
    parameters: {
      type: GenAIType.OBJECT,
      properties: {
        search: { type: GenAIType.STRING, description: 'Search keyword' },
        location: { type: GenAIType.STRING, description: 'Location' },
      },
    },
  },
  {
    name: 'search_providers',
    description: 'Search for service providers when user needs a service.',
    parameters: {
      type: GenAIType.OBJECT,
      properties: {
        serviceSlug: { type: GenAIType.STRING, description: 'Service type: cleaning, plumbing, electrical, painting, moving, appliance-repair, carpentry, hvac, locksmith, gardening, handyman, tutoring, photography, personal-training, pet-care' },
        location: { type: GenAIType.STRING, description: 'Location' },
      },
    },
  },
  {
    name: 'save_cv_data',
    description: 'Save CV data. Use when enough info collected (headline + skill/experience).',
    parameters: {
      type: GenAIType.OBJECT,
      properties: {
        headline: { type: GenAIType.STRING },
        summary: { type: GenAIType.STRING },
        location: { type: GenAIType.STRING },
        skills: { type: GenAIType.ARRAY, items: { type: GenAIType.OBJECT, properties: { name: { type: GenAIType.STRING }, level: { type: GenAIType.STRING } }, required: ['name'] } },
      },
      required: ['headline'],
    },
  },
  {
    name: 'navigate_user',
    description: 'Navigate user to a page.',
    parameters: {
      type: GenAIType.OBJECT,
      properties: {
        page: { type: GenAIType.STRING, description: 'Page path like /jobs, /profile, /providers' },
        reason: { type: GenAIType.STRING },
      },
      required: ['page'],
    },
  },
  {
    name: 'get_service_locations',
    description: 'Get available locations for a service. Call after search_providers returns 0 results, or when user asks which cities have a service.',
    parameters: {
      type: GenAIType.OBJECT,
      properties: {
        serviceSlug: { type: GenAIType.STRING, description: 'Service slug (optional)' },
      },
    },
  },
];

interface LiveSession {
  geminiSession: any;
  locale: string;
  userId?: string;
  isLoggedIn: boolean;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/voice',
})
export class VoiceGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VoiceGateway.name);
  private genAI: GoogleGenAI;
  private sessions = new Map<string, LiveSession>();

  constructor(
    private configService: ConfigService,
    private aiService: AiService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenAI({ apiKey });
  }

  handleDisconnect(client: Socket) {
    const session = this.sessions.get(client.id);
    if (session?.geminiSession) {
      try { session.geminiSession.close(); } catch {}
    }
    this.sessions.delete(client.id);
    this.logger.log(`Voice client disconnected: ${client.id}`);
  }

  @SubscribeMessage('voice:start')
  async handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { locale?: string; userId?: string; isLoggedIn?: boolean; history?: { role: string; content: string }[] },
  ) {
    try {
      const locale = data.locale || 'en';

      const langMap: Record<string, { name: string; instruction: string; voice: string }> = {
        tr: { name: 'Turkish', instruction: 'Her zaman Türkçe konuş. Kısa ve öz yanıtlar ver.', voice: 'Orus' },
        en: { name: 'English', instruction: 'Always speak in English. Give short, concise answers.', voice: 'Kore' },
        de: { name: 'German', instruction: 'Sprich immer auf Deutsch. Gib kurze und prägnante Antworten.', voice: 'Kore' },
        fr: { name: 'French', instruction: 'Parle toujours en français. Donne des réponses courtes et concises.', voice: 'Kore' },
        es: { name: 'Spanish', instruction: 'Habla siempre en español. Da respuestas cortas y concisas.', voice: 'Kore' },
        ar: { name: 'Arabic', instruction: 'تحدث دائماً بالعربية. أعطِ إجابات قصيرة وموجزة.', voice: 'Kore' },
        zh: { name: 'Chinese', instruction: '始终用中文回答。给出简短的回答。', voice: 'Kore' },
        ja: { name: 'Japanese', instruction: '常に日本語で話してください。短く簡潔に答えてください。', voice: 'Kore' },
        pt: { name: 'Portuguese', instruction: 'Fale sempre em português. Dê respostas curtas e concisas.', voice: 'Kore' },
        ru: { name: 'Russian', instruction: 'Всегда говори на русском. Давай короткие и лаконичные ответы.', voice: 'Kore' },
        hi: { name: 'Hindi', instruction: 'हमेशा हिंदी में बोलें। संक्षिप्त और स्पष्ट उत्तर दें।', voice: 'Kore' },
      };
      const lang = langMap[locale] || { name: locale, instruction: `Always respond in ${locale} language.`, voice: 'Kore' };

      const systemPrompt = `You are WorkBee AI voice assistant. Keep responses SHORT and conversational (max 2-3 sentences).

LANGUAGE REQUIREMENT: Detect the language the user is speaking and ALWAYS respond in THE SAME LANGUAGE.
- If user speaks Turkish → respond in Turkish
- If user speaks English → respond in English
- If user speaks Arabic → respond in Arabic
- Default/initial language: ${lang.name}. ${lang.instruction}
- If the user switches language mid-conversation, switch with them immediately.

You help with: finding services (cleaning, plumbing, etc.), finding jobs, creating CVs.
When you understand what service/job the user needs, call the appropriate tool.

SERVICE SLUGS: cleaning, plumbing, electrical, painting, moving, appliance-repair, carpentry, hvac, locksmith, gardening, handyman, tutoring, photography, personal-training, pet-care
LOCATION MAPPING: Londra→London, İstanbul→Istanbul. Always use English/DB version of city names when calling tools.

IMPORTANT: Keep voice responses SHORT. No more than 2-3 sentences. Be direct. Match the user's language.`;

      const session = await this.genAI.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          tools: [{ functionDeclarations: voiceToolDeclarations as any }],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: lang.voice },
            },
          },
        },
        callbacks: {
          onopen: () => {
            this.logger.log(`Gemini Live session opened for ${client.id}`);
            client.emit('voice:ready');
          },
          onmessage: async (message: any) => {
            // Handle different message types
            if (message.serverContent) {
              const sc = message.serverContent;

              // Audio response chunks
              if (sc.modelTurn?.parts) {
                for (const part of sc.modelTurn.parts) {
                  if (part.inlineData?.data) {
                    client.emit('voice:audio', {
                      data: part.inlineData.data,
                      mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                    });
                  }
                  if (part.text) {
                    client.emit('voice:text', { text: part.text });
                  }
                }
              }

              // Turn complete
              if (sc.turnComplete) {
                client.emit('voice:turn-complete');
              }

              // Interrupted (user started speaking while AI was talking)
              if (sc.interrupted) {
                client.emit('voice:interrupted');
              }
            }

            // Tool calls
            if (message.toolCall) {
              this.logger.log(`Voice tool call: ${JSON.stringify(message.toolCall)}`);
              const functionResponses: any[] = [];

              for (const fc of message.toolCall.functionCalls || []) {
                this.logger.log(`🔧 Voice FC: ${fc.name}(${JSON.stringify(fc.args)})`);

                // Execute tool using AiService
                const result = await this.executeVoiceTool(fc.name, fc.args, data);
                functionResponses.push({
                  id: fc.id,
                  name: fc.name,
                  response: result,
                });

                // Send tool result to frontend for UI rendering
                client.emit('voice:tool-result', { name: fc.name, result });
              }

              // Send tool responses back to Gemini
              try {
                const liveSession = this.sessions.get(client.id);
                if (liveSession?.geminiSession) {
                  liveSession.geminiSession.sendToolResponse({ functionResponses });
                }
              } catch (e) {
                this.logger.error('Tool response error:', e);
              }
            }
          },
          onerror: (e: any) => {
            this.logger.error(`Gemini Live error for ${client.id}:`, e?.message || e);
            client.emit('voice:error', { message: 'Connection error' });
          },
          onclose: (e: any) => {
            this.logger.log(`Gemini Live closed for ${client.id}: ${e?.reason || 'unknown'}`);
            client.emit('voice:closed');
          },
        },
      });

      this.sessions.set(client.id, {
        geminiSession: session,
        locale,
        userId: data.userId,
        isLoggedIn: data.isLoggedIn || false,
      });

      // Send conversation history if provided
      if (data.history?.length) {
        const historyText = data.history.map(m =>
          `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
        ).join('\n');
        session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: `[Previous conversation context]\n${historyText}\n[End context. Now respond to new voice input.]` }] }],
        });
      }

    } catch (error) {
      this.logger.error('Voice start error:', error);
      client.emit('voice:error', { message: 'Could not start voice session' });
    }
  }

  @SubscribeMessage('voice:audio-chunk')
  handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: string },
  ) {
    const session = this.sessions.get(client.id);
    if (!session?.geminiSession) {
      client.emit('voice:error', { message: 'No active session' });
      return;
    }

    try {
      session.geminiSession.sendRealtimeInput({
        audio: {
          data: data.audio,
          mimeType: 'audio/pcm;rate=16000',
        },
      });
    } catch (e) {
      this.logger.error('Audio chunk error:', e);
    }
  }

  @SubscribeMessage('voice:stop')
  handleStop(@ConnectedSocket() client: Socket) {
    const session = this.sessions.get(client.id);
    if (session?.geminiSession) {
      try { session.geminiSession.close(); } catch {}
    }
    this.sessions.delete(client.id);
    this.logger.log(`Voice session stopped: ${client.id}`);
  }

  private async executeVoiceTool(name: string, args: any, clientData: any): Promise<any> {
    // Reuse AiService's tool executors via a lightweight session
    const fakeSession = {
      id: 'voice-' + Date.now(),
      userId: clientData.userId || null,
      isLoggedIn: clientData.isLoggedIn || false,
      locale: clientData.locale || 'en',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    switch (name) {
      case 'search_jobs':
        return this.aiService.executeSearchJobsPublic(args);
      case 'search_providers':
        return this.aiService.executeSearchProvidersPublic(args);
      case 'save_cv_data':
        return this.aiService.executeSaveCvDataPublic(args, fakeSession as any);
      case 'navigate_user':
        return { page: args.page, reason: args.reason };
      case 'get_service_locations':
        return this.aiService.executeGetServiceLocationsPublic(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }
}

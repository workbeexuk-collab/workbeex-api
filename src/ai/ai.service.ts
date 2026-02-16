import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AIResponseDto, ServiceIntentResponseDto } from './dto/chat.dto';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 10;

// System Prompt Builder for WorkBee AI Assistant
const buildSystemPrompt = (activeRegions: string[], locale: string = 'en') => {
  const regionsList = activeRegions.length > 0
    ? activeRegions.join(', ')
    : 'London, Manchester, Birmingham, Istanbul, Ankara';

  return `You are WorkBee AI - a friendly assistant for JOBS, SERVICES, and HIRING.

CRITICAL RULE - DETECT USER TYPE FIRST:

1. "iş arıyorum" / "looking for job" / "need work" = JOB SEEKER
   → Set: intent="find_job", userType="provider"
   → Have a NATURAL CONVERSATION first - don't immediately offer buttons

2. "temizlikçi lazım" / "need plumber" / "tamir" = SERVICE SEEKER
   → Set: intent="find_service", userType="customer", serviceKey=...
   → Ask for location

3. "eleman arıyorum" / "hiring" = EMPLOYER
   → Set: intent="post_job", userType="employer"

EXAMPLES:
- "iş arıyorum" → intent="find_job", userType="provider" (JOB SEEKER!)
- "inşaat işi arıyorum" → intent="find_job", userType="provider", profession="construction"
- "temizlikçi arıyorum" → intent="find_service", userType="customer", serviceKey="cleaning"

RESPOND IN USER'S LANGUAGE. Turkish input → Turkish response.
BE CONVERSATIONAL AND FRIENDLY - don't be robotic!

ACTIVE REGIONS: ${regionsList}

CRITICAL RULE: When intent="find_service", you MUST ALWAYS set serviceKey. NEVER leave it null/empty.
If the user mentions ANY cleaning/temizlik word → serviceKey="cleaning"
If unsure which service, pick the closest match from the enum below.

SERVICE MAPPING (set serviceKey to these values):
- cleaning, temizlik, ev temizliği, house cleaning, home cleaning, ofis temizliği, تنظيف, sprzątanie, curățenie → serviceKey="cleaning"
- plumbing, tesisat, tesisatçı, su kaçağı, pipe, leak, water, سباكة, hydraulik, instalator → serviceKey="plumbing"
- electrical, elektrik, elektrikçi, wiring, socket, fuse, كهربائي, elektryk, electrician → serviceKey="electrical"
- painting, boya, boyacı, duvar boyama, decorator, دهان, malarz, zugrav → serviceKey="painting"
- moving, nakliyat, taşınma, ev taşıma, removals → serviceKey="moving"
- appliance repair, beyaz eşya, buzdolabı, çamaşır makinesi, washing machine, fridge → serviceKey="appliance_repair"
- carpentry, marangoz, ahşap, mobilya, furniture, cabinet → serviceKey="carpentry"
- boiler, kombi, heating, ısıtma, radiator, central heating, gas → serviceKey="hvac"
- air conditioning, klima, AC, cooling → serviceKey="hvac"
- locksmith, çilingir, lock, key, door lock → serviceKey="locksmith"
- gardening, bahçe, garden, lawn, landscaping → serviceKey="gardening"
- pest control, haşere, böcek, rodent, exterminator → serviceKey="pest_control"
- roofing, çatı, roof, gutter, tiles → serviceKey="roofing"

PHOTO REQUEST FLOW:
After identifying the service type, ask if the user wants to share a photo of the problem:
- "${locale === 'tr' ? 'Sorunu daha iyi anlamamız için fotoğraf paylaşmak ister misiniz?' : 'Would you like to share a photo so we can better understand the issue?'}"
- Set requestPhoto=true when asking for photo
- If user shares photo, analyze it and update service recommendation

UNDERSTANDING SHORT ANSWERS:
When you ask "What kind of cleaning?" and user says:
- "house", "ev", "home", "ev temizliği" → They mean house cleaning. Set serviceKey="cleaning", move on!
- "office", "ofis" → They mean office cleaning. Set serviceKey="cleaning", move on!
Do NOT ask the same question again!

EXAMPLE CONVERSATION:
User: "boiler repair"
You: "Where do you need heating service?" ← set serviceKey="hvac", provide quickReplyOptions: [{label: "London", value: "London"}, {label: "Manchester", value: "Manchester"}, ...]
User: "London"
You: "Would you like to share a photo of the boiler?" ← set requestPhoto=true, quickReplyOptions: [{label: "Yes, share photo", value: "photo"}, {label: "No, continue", value: "no"}]
User: "no"
You: (if not logged in) "Great! I found heating professionals in London. Please sign up to see their profiles and get quotes." ← set requiresRegistration=true
You: (if logged in) "Great! I found 5 heating professionals in London ready to help." ← set readyToAction=true

CONVERSATION FLOWS:

=== JOB SEEKER FLOW (HAVE A CONVERSATION!) ===
1. User says "iş arıyorum" → set intent="find_job", userType="provider"
   - Ask about their profession/experience warmly: "Ne tür işlerde deneyimin var?" / "What's your background?"
   - Be conversational, show interest!

2. User mentions profession → set profession
   - Acknowledge their experience positively
   - Ask about location: "Nerede iş arıyorsun?" / "Where are you looking for work?"

3. User mentions location →
   - Now we have enough info! Set readyToAction=true
   - Offer options: "Harika! CV oluşturup işverenlerin seni bulmasını sağlayabiliriz veya direkt iş ilanlarına bakabilirsin."
   - quickReplyOptions: [{"label": "CV Oluştur", "value": "cv"}, {"label": "İş İlanları", "value": "jobs"}]

EXAMPLE JOB SEEKER CONVERSATION:
User: "Londra'ya yeni taşındım, iş arıyorum, yazılımcıydım"
You: "Hoş geldin Londra'ya! 🎉 Yazılım geliştirici olarak deneyimin varmış, harika bir alan. Kaç yıllık deneyimin var? Frontend mi backend mi yoksa fullstack mi?"

User: "5 yıl frontend, React kullanıyorum"
You: "5 yıl React deneyimi çok değerli! Londra'da React developerlar için iyi fırsatlar var. CV oluşturmak işverenlerin seni bulmasını kolaylaştırır. Ne yapmak istersin?"
→ NOW set readyToAction=true, quickReplyOptions: [{"label": "CV Oluştur", "value": "cv"}, {"label": "İş İlanları", "value": "jobs"}]

DON'T IMMEDIATELY OFFER BUTTONS - HAVE A HUMAN CONVERSATION FIRST!

=== SERVICE SEEKER FLOW ===
1. User mentions service → set serviceKey, ask for location WITH quickReplyOptions array of active regions
2. User gives location → set locationArea, ask for photo with quickReplyOptions: Yes/No
3. User responds to photo request → continue
4. Check login status:
   - If isLoggedIn=false → set requiresRegistration=true, tell user to sign up to see professionals
   - If isLoggedIn=true → set readyToAction=true, show professionals count

IMPORTANT - quickReplyOptions FORMAT:
When asking for location, ALWAYS include:
quickReplyOptions: [
  {"label": "London", "value": "London"},
  {"label": "Manchester", "value": "Manchester"},
  {"label": "Birmingham", "value": "Birmingham"},
  ... (use active regions from list above)
]

When asking for photo, ALWAYS include:
quickReplyOptions: [
  {"label": "📷 Share Photo", "value": "share_photo"},
  {"label": "Skip", "value": "skip"}
]

CRITICAL REGISTRATION RULE:
- NEVER say "account created" - you cannot create accounts!
- NEVER set requiresRegistration=true for JOB SEEKERS - they can browse jobs and create CV without signing up first
- Only set requiresRegistration=true for SERVICE SEEKERS who want to see provider profiles
- When requiresRegistration=true, say: "Sign up to see matching professionals" or "Kayıt olarak profesyonelleri görün"
- The frontend will show a registration modal when requiresRegistration=true

KEEP ALL DATA in every response:
- serviceKey: preserve once set
- locationArea: preserve once set`;
};

// Session storage
interface ConversationSession {
  id: string;
  userId: string | null;
  isLoggedIn: boolean;
  locale: string;
  collectedData: {
    userType: 'customer' | 'provider' | 'employer' | null;
    serviceType: string | null;
    serviceKey: string | null;
    location: string | null;
    timing: string | null;
    budget: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private genAI: GoogleGenAI | null = null;
  private sessions: Map<string, ConversationSession> = new Map();
  private cachedRegions: string[] = [];
  private regionsCacheTime: Date | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (this.apiKey) {
      this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  // Get active service regions from providers (cached for 5 minutes)
  private async getActiveRegions(): Promise<string[]> {
    const cacheExpiry = 5 * 60 * 1000; // 5 minutes

    if (this.cachedRegions.length > 0 && this.regionsCacheTime) {
      const elapsed = Date.now() - this.regionsCacheTime.getTime();
      if (elapsed < cacheExpiry) {
        return this.cachedRegions;
      }
    }

    try {
      const providers = await this.prisma.provider.findMany({
        where: {
          verified: true,
          location: { not: null },
        },
        select: { location: true },
        distinct: ['location'],
      });

      const regions = providers
        .map(p => p.location)
        .filter((loc): loc is string => loc !== null)
        .map(loc => {
          // Extract city name from location string
          const parts = loc.split(',').map(p => p.trim());
          return parts[0]; // Return first part (usually city)
        })
        .filter((v, i, a) => a.indexOf(v) === i) // Unique values
        .slice(0, 10); // Limit to 10 regions

      this.cachedRegions = regions.length > 0 ? regions : ['London', 'Manchester', 'Birmingham', 'Istanbul', 'Ankara'];
      this.regionsCacheTime = new Date();

      this.logger.log(`Cached ${this.cachedRegions.length} active regions`);
      return this.cachedRegions;
    } catch (error) {
      this.logger.error('Error fetching regions:', error);
      return ['London', 'Manchester', 'Birmingham', 'Istanbul', 'Ankara'];
    }
  }

  private getSession(sessionId?: string, userId?: string, isLoggedIn?: boolean, locale?: string): ConversationSession {
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      session.updatedAt = new Date();
      if (userId) session.userId = userId;
      if (isLoggedIn !== undefined) session.isLoggedIn = isLoggedIn;
      if (locale) session.locale = locale;
      return session;
    }

    const newSession: ConversationSession = {
      id: sessionId || uuidv4(),
      userId: userId || null,
      isLoggedIn: isLoggedIn || false,
      locale: locale || 'en',
      collectedData: {
        userType: null,
        serviceType: null,
        serviceKey: null,
        location: null,
        timing: null,
        budget: null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(newSession.id, newSession);
    return newSession;
  }

  private buildSessionContext(session: ConversationSession): string {
    const parts: string[] = [];
    parts.push(`\n\n[SESSION: locale=${session.locale}, loggedIn=${session.isLoggedIn}]`);

    if (session.collectedData.userType) {
      parts.push(`[userType: ${session.collectedData.userType}]`);
    }
    if (session.collectedData.serviceKey) {
      parts.push(`[service: ${session.collectedData.serviceKey}]`);
    }
    if (session.collectedData.location) {
      parts.push(`[location: ${session.collectedData.location}]`);
    }

    return parts.join(' ');
  }

  // Main chat function - SIMPLIFIED
  async chat(
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
    sessionId?: string,
    userId?: string,
    isLoggedIn?: boolean,
    locale?: string,
  ): Promise<AIResponseDto> {
    const session = this.getSession(sessionId, userId, isLoggedIn, locale);

    // Mesaj dilini algıla - kullanıcı Türkçe yazıyorsa locale'i güncelle
    const turkishChars = /[çğıöşüÇĞİÖŞÜ]/;
    const turkishWords = /\b(merhaba|arıyorum|istiyorum|lazım|lütfen|teşekkür|evet|hayır|nerede|nasıl|bölge|ihtiyac|ustası|ustasıyım|yapıyorum|londrada|şuan|temizlik|boyacı|tesisatçı)\b/i;
    if (turkishChars.test(userMessage) || turkishWords.test(userMessage)) {
      session.locale = 'tr';
    }

    const sessionContext = this.buildSessionContext(session);

    // Mesaj uzunluğu limiti
    const safeMessage = userMessage.slice(0, MAX_MESSAGE_LENGTH);

    // History sınırlama (son 10 mesaj)
    const trimmedHistory = conversationHistory.slice(-MAX_HISTORY_MESSAGES);

    // Get active regions for dynamic prompt
    const activeRegions = await this.getActiveRegions();
    const systemPrompt = buildSystemPrompt(activeRegions, session.locale);

    const messages = [
      ...trimmedHistory.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
      {
        role: 'user',
        parts: [{ text: safeMessage + sessionContext }],
      },
    ];

    // Response schema - with intent detection and photo request support
    const responseSchema = {
      type: 'object',
      properties: {
        understood: { type: 'boolean' },
        // Intent detection - CRITICAL for distinguishing user types
        intent: {
          type: 'string',
          nullable: true,
          enum: ['find_job', 'find_service', 'post_job', 'browse', 'help', 'unknown']
        },
        userType: {
          type: 'string',
          nullable: true,
          enum: ['customer', 'provider', 'employer']
        },
        // For job seekers
        profession: { type: 'string', nullable: true },
        // For service seekers
        serviceType: { type: 'string', nullable: true },
        serviceKey: {
          type: 'string',
          nullable: true,
          enum: ['cleaning', 'plumbing', 'electrical', 'painting', 'moving', 'appliance_repair', 'carpentry', 'hvac', 'locksmith', 'gardening', 'pest_control', 'roofing'],
        },
        // Location
        locationArea: { type: 'string', nullable: true },
        // Flow control
        needsMoreInfo: { type: 'boolean' },
        readyToAction: { type: 'boolean' },
        requiresRegistration: { type: 'boolean' },
        requestPhoto: { type: 'boolean' },
        // Suggested action
        suggestedAction: {
          type: 'string',
          nullable: true,
          enum: ['continue_chat', 'show_providers', 'show_jobs', 'create_cv', 'navigate']
        },
        navigateTo: { type: 'string', nullable: true },
        // AI response
        aiResponse: { type: 'string' },
        // Quick replies
        quickReplyOptions: {
          type: 'array',
          nullable: true,
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'string' },
            },
            required: ['label', 'value'],
          },
        },
      },
      required: ['understood', 'needsMoreInfo', 'readyToAction', 'aiResponse'],
    };

    const requestBody = {
      contents: messages,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
        responseSchema,
        thinkingConfig: { thinkingBudget: 0 }, // Düşünme kapalı - maliyet tasarrufu
      },
    };

    try {
      this.logger.log(`AI Chat: "${safeMessage.substring(0, 50)}..." locale=${session.locale}`);
      this.logger.log(`Conversation history: ${trimmedHistory.length}/${conversationHistory.length} messages`);
      this.logger.log(`Session context: ${sessionContext}`);

      const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Gemini API error ${response.status}: ${errorText}`);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();

      // Token kullanım loglama
      const usage = data.usageMetadata;
      if (usage) {
        this.logger.log(`📊 Tokens - input: ${usage.promptTokenCount}, output: ${usage.candidatesTokenCount}, total: ${usage.totalTokenCount}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        this.logger.error('No text in Gemini response:', JSON.stringify(data).substring(0, 500));
        throw new Error('No response from AI');
      }

      this.logger.log(`AI Response: ${text.substring(0, 300)}...`);

      const parsed = JSON.parse(text);

      // Fallback: serviceKey null ama intent find_service ise mesajdan çıkar
      if (!parsed.serviceKey && parsed.intent === 'find_service') {
        const msg = safeMessage.toLowerCase();
        const keywordMap: Record<string, string[]> = {
          cleaning: ['temizlik', 'temizlikçi', 'temizligi', 'cleaning', 'تنظيف', 'sprzątanie', 'curățenie'],
          plumbing: ['tesisat', 'tesisatçı', 'musluk', 'su kaçağı', 'plumb', 'pipe', 'leak', 'سباكة', 'hydraulik'],
          electrical: ['elektrik', 'elektrikçi', 'electri', 'wiring', 'كهربائي', 'elektryk'],
          painting: ['boya', 'boyacı', 'paint', 'دهان', 'malarz', 'zugrav'],
          moving: ['nakliyat', 'taşınma', 'moving', 'removals'],
          appliance_repair: ['beyaz eşya', 'buzdolabı', 'çamaşır', 'appliance', 'washing machine', 'fridge'],
          carpentry: ['marangoz', 'mobilya', 'carpent', 'furniture'],
          hvac: ['kombi', 'kalorifer', 'boiler', 'heating', 'klima', 'air condition'],
          locksmith: ['çilingir', 'kilit', 'locksmith', 'lock'],
          gardening: ['bahçe', 'garden', 'lawn'],
          pest_control: ['haşere', 'böcek', 'pest', 'rodent'],
          roofing: ['çatı', 'roof', 'gutter'],
        };
        for (const [key, keywords] of Object.entries(keywordMap)) {
          if (keywords.some(kw => msg.includes(kw))) {
            parsed.serviceKey = key;
            this.logger.log(`🔧 serviceKey fallback: "${key}" (keyword match)`);
            break;
          }
        }
      }

      this.logger.log(`Parsed - serviceKey: ${parsed.serviceKey}, registrationStep: ${parsed.registrationStep}`);

      // Update session
      if (parsed.userType) session.collectedData.userType = parsed.userType;
      if (parsed.serviceKey) session.collectedData.serviceKey = parsed.serviceKey;
      if (parsed.locationArea) session.collectedData.location = parsed.locationArea;

      // Log intent detection
      this.logger.log(`Intent Detection - userType: ${parsed.userType}, intent: ${parsed.intent}, profession: ${parsed.profession}, serviceKey: ${parsed.serviceKey}`);

      // Determine suggested action based on intent
      let suggestedAction: string = 'continue_chat';
      if (parsed.suggestedAction) {
        suggestedAction = parsed.suggestedAction;
      } else if (parsed.readyToAction) {
        if (parsed.intent === 'find_job') {
          suggestedAction = 'show_jobs';
        } else if (parsed.intent === 'find_service') {
          suggestedAction = 'show_providers';
        }
      }

      // Build full response
      const fullResponse: AIResponseDto = {
        sessionId: session.id,
        messageId: uuidv4(),
        timestamp: new Date().toISOString(),
        authState: {
          isLoggedIn: session.isLoggedIn,
          userId: session.userId,
          userName: null,
          requiresAuth: false,
          authStep: 'none',
        },
        registration: null,
        requiresRegistration: parsed.requiresRegistration || false,
        userType: parsed.userType || null,
        intent: parsed.intent || null,
        category: null,
        serviceType: parsed.serviceType || null,
        serviceKey: parsed.serviceKey || null,
        profession: parsed.profession || null,
        location: parsed.locationArea ? { area: parsed.locationArea, postcode: null, fullAddress: null, coordinates: null } : null,
        budget: null,
        timing: parsed.urgency ? { urgency: parsed.urgency, preferredDate: null, preferredTime: null, duration: null } : null,
        details: null,
        preferences: null,
        quickReplies: parsed.quickReplyOptions ? {
          type: parsed.quickReplyType || 'buttons',
          options: parsed.quickReplyOptions,
        } : null,
        specialActions: parsed.navigateTo ? { navigateTo: parsed.navigateTo } : null,
        stats: null,
        progress: {
          collectedFields: Object.entries(session.collectedData).filter(([, v]) => v !== null).map(([k]) => k),
          missingFields: Object.entries(session.collectedData).filter(([, v]) => v === null).map(([k]) => k),
          completionPercent: Math.round((Object.values(session.collectedData).filter(v => v !== null).length / 6) * 100),
          currentPhase: !parsed.userType ? 'userType' : parsed.intent === 'find_job' ? 'service' : !parsed.serviceKey ? 'service' : !parsed.locationArea ? 'details' : 'complete',
        },
        understood: parsed.understood,
        needsMoreInfo: parsed.needsMoreInfo,
        readyToAction: parsed.readyToAction,
        requestPhoto: parsed.requestPhoto || false,
        suggestedAction: suggestedAction as any,
        aiResponse: parsed.aiResponse,
        nextQuestion: parsed.nextQuestion || null,
        error: null,
      };

      return fullResponse;
    } catch (error) {
      this.logger.error('Chat error:', error instanceof Error ? error.message : error);
      return this.getFallbackResponse(session.id, session.locale);
    }
  }

  // Legacy function for backwards compatibility
  async analyzeUserIntent(
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  ): Promise<ServiceIntentResponseDto> {
    const response = await this.chat(userMessage, conversationHistory);

    return {
      understood: response.understood,
      serviceType: response.serviceType,
      serviceKey: response.serviceKey,
      location: response.location?.area || null,
      urgency: response.timing?.urgency as any || null,
      frequency: response.timing?.duration as any || null,
      needsMoreInfo: response.needsMoreInfo,
      nextQuestion: response.nextQuestion,
      aiResponse: response.aiResponse,
      readyToSearch: response.readyToAction && response.suggestedAction === 'show_providers',
    };
  }

  // Fallback response with locale support
  private getFallbackResponse(sessionId: string, locale: string = 'en'): AIResponseDto {
    const messages: Record<string, { welcome: string; findService: string; findJob: string; postJob: string }> = {
      en: {
        welcome: "Hello! I'm the WorkBee assistant. How can I help you today?",
        findService: 'Looking for a Service',
        findJob: "I'm a Professional",
        postJob: 'Hiring Staff',
      },
      tr: {
        welcome: "Merhaba! Ben WorkBee asistanı. Size nasıl yardımcı olabilirim?",
        findService: 'Hizmet Arıyorum',
        findJob: 'Ustayım, İş Arıyorum',
        postJob: 'Eleman Arıyorum',
      },
    };

    const msg = messages[locale] || messages.en;

    return {
      sessionId,
      messageId: uuidv4(),
      timestamp: new Date().toISOString(),
      authState: {
        isLoggedIn: false,
        userId: null,
        userName: null,
        requiresAuth: false,
        authStep: 'none',
      },
      registration: null,
      userType: null,
      intent: null,
      category: null,
      serviceType: null,
      serviceKey: null,
      profession: null,
      location: null,
      budget: null,
      timing: null,
      details: null,
      preferences: null,
      quickReplies: {
        type: 'buttons',
        options: [
          { label: msg.findService, value: 'find_service' },
          { label: msg.findJob, value: 'find_job' },
          { label: msg.postJob, value: 'post_job' },
        ],
      },
      specialActions: null,
      stats: null,
      progress: {
        collectedFields: [],
        missingFields: ['userType', 'service', 'location'],
        completionPercent: 0,
        currentPhase: 'userType',
      },
      understood: false,
      needsMoreInfo: true,
      readyToAction: false,
      suggestedAction: 'continue_chat',
      aiResponse: msg.welcome,
      nextQuestion: null,
      error: null,
    };
  }

  // Welcome message
  getWelcomeMessage(locale: string = 'en'): AIResponseDto {
    const sessionId = uuidv4();
    this.getSession(sessionId, undefined, undefined, locale);

    const messages: Record<string, { welcome: string; findService: string; findServiceDesc: string; findJob: string; findJobDesc: string; postJob: string; postJobDesc: string }> = {
      en: {
        welcome: "Hello! I'm the WorkBee assistant. How can I help you today?",
        findService: 'Looking for a Service',
        findServiceDesc: 'Cleaning, repairs, painting...',
        findJob: "I'm a Professional",
        findJobDesc: 'Browse job listings',
        postJob: 'Hiring Staff',
        postJobDesc: 'Post a job listing',
      },
      tr: {
        welcome: "Merhaba! Ben WorkBee asistanı. Size nasıl yardımcı olabilirim?",
        findService: 'Hizmet Arıyorum',
        findServiceDesc: 'Temizlik, tamirat, boyama...',
        findJob: 'Ustayım, İş Arıyorum',
        findJobDesc: 'İş ilanlarını gör',
        postJob: 'Eleman Arıyorum',
        postJobDesc: 'İş ilanı ver',
      },
      pl: {
        welcome: "Cześć! Jestem asystentem WorkBee. Jak mogę ci pomóc?",
        findService: 'Szukam Usługi',
        findServiceDesc: 'Sprzątanie, naprawy, malowanie...',
        findJob: 'Jestem Fachowcem',
        findJobDesc: 'Przeglądaj oferty pracy',
        postJob: 'Szukam Pracownika',
        postJobDesc: 'Dodaj ogłoszenie o pracę',
      },
      ro: {
        welcome: "Bună! Sunt asistentul WorkBee. Cu ce te pot ajuta?",
        findService: 'Caut un Serviciu',
        findServiceDesc: 'Curățenie, reparații, vopsitorie...',
        findJob: 'Sunt Profesionist',
        findJobDesc: 'Vezi anunțuri de muncă',
        postJob: 'Caut Personal',
        postJobDesc: 'Postează un anunț de angajare',
      },
    };

    const msg = messages[locale] || messages.en;

    return {
      sessionId,
      messageId: uuidv4(),
      timestamp: new Date().toISOString(),
      authState: {
        isLoggedIn: false,
        userId: null,
        userName: null,
        requiresAuth: false,
        authStep: 'none',
      },
      registration: null,
      userType: null,
      intent: null,
      category: null,
      serviceType: null,
      serviceKey: null,
      profession: null,
      location: null,
      budget: null,
      timing: null,
      details: null,
      preferences: null,
      quickReplies: {
        type: 'buttons',
        options: [
          { label: msg.findService, value: 'find_service', description: msg.findServiceDesc },
          { label: msg.findJob, value: 'find_job', description: msg.findJobDesc },
          { label: msg.postJob, value: 'post_job', description: msg.postJobDesc },
        ],
      },
      specialActions: null,
      stats: null,
      progress: {
        collectedFields: [],
        missingFields: ['userType'],
        completionPercent: 0,
        currentPhase: 'userType',
      },
      understood: true,
      needsMoreInfo: true,
      readyToAction: false,
      suggestedAction: 'continue_chat',
      aiResponse: msg.welcome,
      nextQuestion: null,
      error: null,
    };
  }

  // Voice chat with TTS response
  async voiceChat(
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
    sessionId?: string,
    userId?: string,
    isLoggedIn?: boolean,
    locale?: string,
  ): Promise<{ text: string; audio: string | null; intent: AIResponseDto }> {
    const intent = await this.chat(userMessage, conversationHistory, sessionId, userId, isLoggedIn, locale);

    let audioBase64: string | null = null;

    if (this.genAI) {
      try {
        const response = await this.genAI.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text: intent.aiResponse }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });

        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
          audioBase64 = audioData;
        }
      } catch (error) {
        this.logger.error('TTS error:', error);
      }
    }

    return {
      text: intent.aiResponse,
      audio: audioBase64,
      intent,
    };
  }

  // Image Analysis (Vision)
  async analyzeImage(imageBase64: string, mimeType: string = 'image/jpeg', locale: string = 'en'): Promise<{
    serviceType: string | null;
    serviceKey: string | null;
    description: string;
    urgency: 'low' | 'medium' | 'high' | 'emergency';
    suggestions: string[];
  }> {
    if (!this.apiKey) {
      this.logger.error('Gemini API key not configured');
      return {
        serviceType: null,
        serviceKey: null,
        description: locale === 'tr' ? 'Görsel analiz şu an kullanılamıyor.' : 'Image analysis is currently unavailable.',
        urgency: 'medium',
        suggestions: [],
      };
    }

    const systemPrompt = locale === 'tr'
      ? `Sen bir ev hizmetleri uzmanısın. Gönderilen fotoğrafı analiz et ve:
1. Hangi hizmet gerekiyor (temizlik, tesisat, elektrik, boya, tamirat vb.)
2. Sorunun aciliyeti (low/medium/high/emergency)
3. Kısa bir açıklama
4. Yapılması gerekenler

JSON formatında yanıt ver:
{
  "serviceType": "Türkçe hizmet adı",
  "serviceKey": "cleaning|plumbing|electrical|painting|carpentry|appliance_repair|hvac|roofing|pest_control|locksmith|moving|gardening",
  "description": "Kısa açıklama",
  "urgency": "low|medium|high|emergency",
  "suggestions": ["öneri 1", "öneri 2"]
}`
      : `You are a home services expert. Analyze the photo and provide:
1. What service is needed (cleaning, plumbing, electrical, painting, repair, etc.)
2. Urgency level (low/medium/high/emergency)
3. Brief description
4. Recommendations

Respond in JSON format:
{
  "serviceType": "Service name",
  "serviceKey": "cleaning|plumbing|electrical|painting|carpentry|appliance_repair|hvac|roofing|pest_control|locksmith|moving|gardening",
  "description": "Brief description",
  "urgency": "low|medium|high|emergency",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

    try {
      const requestBody = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageBase64,
                },
              },
              {
                text: systemPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      };

      const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Gemini Vision error ${response.status}: ${errorText}`);
        throw new Error('Vision API error');
      }

      const data = await response.json();

      // Token loglama
      if (data.usageMetadata) {
        this.logger.log(`📊 Vision Tokens - input: ${data.usageMetadata.promptTokenCount}, output: ${data.usageMetadata.candidatesTokenCount}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('No response from Vision API');
      }

      this.logger.log(`Vision Result: ${text.substring(0, 200)}...`);
      const parsed = JSON.parse(text);

      return {
        serviceType: parsed.serviceType || null,
        serviceKey: parsed.serviceKey || null,
        description: parsed.description || (locale === 'tr' ? 'Görsel analiz edildi.' : 'Image analyzed.'),
        urgency: parsed.urgency || 'medium',
        suggestions: parsed.suggestions || [],
      };
    } catch (error) {
      this.logger.error('Vision error:', error);
      return {
        serviceType: null,
        serviceKey: null,
        description: locale === 'tr' ? 'Görsel analiz edilemedi.' : 'Could not analyze image.',
        urgency: 'medium',
        suggestions: [],
      };
    }
  }

  // Speech-to-Text (Audio Transcription)
  async speechToText(audioBase64: string, mimeType: string = 'audio/webm'): Promise<string | null> {
    if (!this.apiKey) {
      this.logger.error('Gemini API key not configured');
      return null;
    }

    try {
      const requestBody = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: audioBase64,
                },
              },
              {
                text: 'Transcribe this audio exactly as spoken. Return ONLY the transcription text, nothing else.',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
        },
      };

      const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Gemini STT error ${response.status}: ${errorText}`);
        return null;
      }

      const data = await response.json();
      const transcription = data.candidates?.[0]?.content?.parts?.[0]?.text;

      this.logger.log(`STT Result: "${transcription?.substring(0, 100)}..."`);
      return transcription?.trim() || null;
    } catch (error) {
      this.logger.error('STT error:', error);
      return null;
    }
  }

  // Text-to-Speech only
  async textToSpeech(text: string): Promise<string | null> {
    if (!this.genAI) {
      this.logger.error('GenAI not initialized');
      return null;
    }

    try {
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return audioData || null;
    } catch (error) {
      this.logger.error('TTS error:', error);
      return null;
    }
  }

  // CV Builder AI Chat
  async cvChat(
    message: string,
    conversationHistory: { role: string; content: string }[],
    currentCvData: any,
    userInfo: { firstName?: string; lastName?: string; email?: string } | null,
    locale: string = 'en',
  ): Promise<{
    response: string;
    extractedData: any;
    readyToSave: boolean;
    suggestedQuestions: string[];
  }> {
    if (!this.apiKey) {
      this.logger.error('Gemini API key not configured');
      return this.getCvChatFallback(message, locale);
    }

    try {
      const systemPrompt = this.buildCvChatPrompt(currentCvData, userInfo, locale);

      // History ve mesaj sınırlama
      const safeCvMessage = message.slice(0, MAX_MESSAGE_LENGTH);
      const trimmedCvHistory = conversationHistory.slice(-MAX_HISTORY_MESSAGES);

      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'I understand. I will help build the CV conversationally.' }] },
        ...trimmedCvHistory.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
        { role: 'user', parts: [{ text: safeCvMessage }] },
      ];

      const requestBody = {
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 1024 }, // CV builder için düşük düşünme bütçesi
        },
      };

      const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`CV Chat API error ${response.status}: ${errorText}`);
        return this.getCvChatFallback(message, locale);
      }

      const data = await response.json();

      // Token loglama
      if (data.usageMetadata) {
        this.logger.log(`📊 CV Tokens - input: ${data.usageMetadata.promptTokenCount}, output: ${data.usageMetadata.candidatesTokenCount}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        return this.getCvChatFallback(message, locale);
      }

      this.logger.log(`CV Chat Response: ${text.substring(0, 200)}...`);

      const parsed = JSON.parse(text);
      return {
        response: parsed.response || (locale === 'tr' ? 'Anlıyorum, devam edelim.' : 'Got it, let\'s continue.'),
        extractedData: parsed.extractedData || null,
        readyToSave: parsed.readyToSave || false,
        suggestedQuestions: parsed.suggestedQuestions || [],
      };
    } catch (error) {
      this.logger.error('CV Chat error:', error);
      return this.getCvChatFallback(message, locale);
    }
  }

  private buildCvChatPrompt(currentCvData: any, userInfo: any, locale: string): string {
    return `You are a friendly CV builder assistant helping users create professional, ATS-optimized resumes.

USER INFO:
${userInfo ? `Name: ${userInfo.firstName} ${userInfo.lastName}, Email: ${userInfo.email}` : 'Not logged in'}

CURRENT CV DATA:
${JSON.stringify(currentCvData, null, 2)}

LANGUAGE: ${locale} (respond in this language - Turkish if 'tr', English otherwise)

YOUR TASK:
1. Have a natural conversation to gather CV information
2. Extract structured data from what the user tells you
3. Ask follow-up questions naturally (not like a form)
4. Acknowledge what you learned before asking more

EXTRACTION RULES:
- When user mentions a job/role, extract it as "headline"
- When user mentions a company + duration, create "newExperience" entry
- When user lists technologies/tools, create "newSkills" entries
- When user mentions education, create "newEducation" entry
- When user mentions a city/country for job search, add to "personalInfo.location"

RESPOND WITH JSON:
{
  "response": "your conversational response in user's language",
  "extractedData": {
    "headline": "extracted job title if mentioned",
    "personalInfo": { "location": "if mentioned" },
    "newExperience": [{ "company": "...", "title": "...", "description": "...", "current": false, "achievements": [] }],
    "newSkills": [{ "name": "...", "level": "INTERMEDIATE" }],
    "newEducation": [{ "institution": "...", "degree": "...", "fieldOfStudy": "...", "current": false }],
    "summary": "if user provides or you generate one"
  },
  "readyToSave": false,
  "suggestedQuestions": ["optional follow-up questions"]
}

IMPORTANT:
- Be conversational, not robotic
- Acknowledge what user shared before asking more
- If user gives multiple pieces of info, extract all of them
- extractedData can be null if nothing new was learned
- Set readyToSave=true when CV has: headline + at least 1 experience OR 3+ skills`;
  }

  private getCvChatFallback(message: string, locale: string): {
    response: string;
    extractedData: any;
    readyToSave: boolean;
    suggestedQuestions: string[];
  } {
    const isTurkish = locale === 'tr' || /[ğüşöçİĞÜŞÖÇ]/.test(message);

    return {
      response: isTurkish
        ? 'Anlıyorum! Bana biraz daha kendinden bahset - hangi şirketlerde çalıştın, ne tür projeler yaptın?'
        : 'Got it! Tell me more about yourself - where have you worked, what kind of projects have you done?',
      extractedData: null,
      readyToSave: false,
      suggestedQuestions: [],
    };
  }
}

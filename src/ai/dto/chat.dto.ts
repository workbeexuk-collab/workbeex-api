import { IsString, IsArray, IsOptional, ValidateNested, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

// ===== REQUEST DTOs =====

class MessageDto {
  @IsEnum(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatRequestDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  history?: MessageDto[];

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  isLoggedIn?: boolean;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  locale?: string; // 'en' | 'tr' | 'pl' | 'ro' - default: 'en'

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class VerifyCodeRequestDto {
  @IsString()
  phone: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class TextToSpeechRequestDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  voiceName?: string; // Gemini TTS voice: Kore, Puck, Charon, Fenrir, Aoede, Leda, Orus, Zephyr
}

export class SpeechToTextRequestDto {
  @IsString()
  audio: string; // Base64 encoded audio

  @IsOptional()
  @IsString()
  mimeType?: string; // 'audio/webm', 'audio/mp4', 'audio/wav' etc.
}

export class ImageAnalysisRequestDto {
  @IsString()
  image: string; // Base64 encoded image

  @IsOptional()
  @IsString()
  mimeType?: string; // 'image/jpeg', 'image/png', 'image/webp' etc.

  @IsOptional()
  @IsString()
  locale?: string; // 'en' | 'tr'
}

// ===== RESPONSE DTOs =====

// Auth State
export interface AuthStateDto {
  isLoggedIn: boolean;
  userId: string | null;
  userName: string | null;
  requiresAuth: boolean;
  authStep: 'none' | 'name' | 'phone' | 'phone_verify' | 'email' | 'password' | 'complete' | null;
}

// Registration Data
export interface RegistrationDataDto {
  currentStep: number;
  totalSteps: number;
  collectedData: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    phoneVerified: boolean;
    email: string | null;
    emailVerified: boolean;
    userType: 'customer' | 'provider' | 'employer' | null;
  };
  nextField: 'firstName' | 'lastName' | 'phone' | 'phoneCode' | 'email' | 'password' | 'userType' | null;
  verificationSent: boolean;
  verificationExpiry: string | null;
}

// Location Data
export interface LocationDataDto {
  area: string | null;
  postcode: string | null;
  fullAddress: string | null;
  coordinates: { lat: number; lng: number } | null;
}

// Budget Data
export interface BudgetDataDto {
  min: number | null;
  max: number | null;
  currency: 'GBP' | 'TRY' | 'EUR';
  type: 'total' | 'hourly' | 'daily';
}

// Timing Data
export interface TimingDataDto {
  urgency: 'immediate' | 'today' | 'this_week' | 'this_month' | 'flexible' | null;
  preferredDate: string | null;
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'anytime' | string | null;
  duration: 'one_time' | 'daily' | 'weekly' | 'monthly' | 'permanent' | null;
}

// Details Data
export interface DetailsDataDto {
  description: string | null;
  quantity: string | null;
  size: string | null;
  photos: string[];
  specialRequests: string[];
}

// Preferences Data
export interface PreferencesDataDto {
  gender: 'male' | 'female' | 'any' | null;
  verified: boolean | null;
  minRating: number | null;
  language: string | null;
  experienceYears: number | null;
}

// Quick Reply Option
export interface QuickReplyOptionDto {
  label: string;
  value: string;
  icon?: string;
  description?: string;
  selected?: boolean;
}

// Quick Replies
export interface QuickRepliesDto {
  type: 'chips' | 'buttons' | 'carousel' | 'checklist' | 'input' | 'date' | 'time' | 'location';
  inputType?: 'text' | 'phone' | 'email' | 'password' | 'otp' | 'number' | 'textarea';
  inputPlaceholder?: string;
  inputLabel?: string;
  multiSelect?: boolean;
  options: QuickReplyOptionDto[];
}

// Price Estimate
export interface PriceEstimateDto {
  average: number;
  min: number;
  max: number;
  currency: string;
  basedOn: string; // "47 similar jobs in your area"
}

// Provider Preview
export interface ProviderPreviewDto {
  id: string;
  name: string;
  avatar: string | null;
  rating: number;
  reviewCount: number;
  available: string; // "Now", "2 hours", "Tomorrow"
  price: string | null; // "£25/hr"
  verified: boolean;
}

// Special Actions
export interface SpecialActionsDto {
  // Auth actions
  sendPhoneVerification?: { phone: string };
  verifyPhoneCode?: { phone: string; expectedCode?: string };
  sendEmailVerification?: { email: string };
  createAccount?: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    password: string;
    userType: 'customer' | 'provider' | 'employer';
  };
  loginUser?: { email: string; password: string };

  // UI actions
  showPriceEstimate?: PriceEstimateDto;
  showAvailableProviders?: {
    count: number;
    providers: ProviderPreviewDto[];
  };
  requestPhoto?: { maxPhotos: number; purpose: string };
  requestLocation?: { useGPS: boolean; placeholder: string };
  showCalendar?: { minDate?: string; maxDate?: string };
  showTimePicker?: { slots: string[] };

  // Navigation actions
  navigateTo?: string; // '/providers', '/jobs', '/profile'
  openModal?: 'login' | 'register' | 'photo' | 'location' | 'calendar';
}

// Stats & Insights
export interface StatsDto {
  similarRequestsThisWeek?: number;
  averageResponseTime?: string;
  topProviderInArea?: string;
  completionRate?: string;
  averageRating?: number;
}

// Progress
export interface ProgressDto {
  collectedFields: string[];
  missingFields: string[];
  completionPercent: number;
  currentPhase: 'auth' | 'userType' | 'service' | 'details' | 'preferences' | 'complete';
}

// Main AI Response DTO
export interface AIResponseDto {
  // Session
  sessionId: string;
  messageId: string;
  timestamp: string;

  // Auth State
  authState: AuthStateDto;

  // Registration (if in registration flow)
  registration: RegistrationDataDto | null;

  // Registration trigger - when true, frontend should show registration modal
  requiresRegistration?: boolean;

  // User Classification
  userType: 'customer' | 'provider' | 'employer' | null;
  intent:
    | 'find_service'
    | 'find_job'
    | 'post_job'
    | 'post_service'
    | 'register'
    | 'login'
    | 'browse'
    | 'help'
    | 'unknown'
    | null;

  // Service/Job Data
  category: string | null;           // "home_services", "restaurant", "construction"
  serviceType: string | null;        // "cleaning", "plumbing", "dishwasher"
  serviceKey: string | null;         // for API lookup
  profession: string | null;         // for providers: "painter", "plumber"

  // Detailed Data
  location: LocationDataDto | null;
  budget: BudgetDataDto | null;
  timing: TimingDataDto | null;
  details: DetailsDataDto | null;
  preferences: PreferencesDataDto | null;

  // UI Elements
  quickReplies: QuickRepliesDto | null;
  specialActions: SpecialActionsDto | null;
  stats: StatsDto | null;
  progress: ProgressDto;

  // Control Flags
  understood: boolean;
  needsMoreInfo: boolean;
  readyToAction: boolean;
  requestPhoto?: boolean; // true when AI is asking user to share a photo
  suggestedAction:
    | 'continue_chat'
    | 'show_providers'
    | 'show_jobs'
    | 'show_job_form'
    | 'create_quote_request'
    | 'register_user'
    | 'verify_phone'
    | 'verify_email'
    | 'login_user'
    | 'complete_registration'
    | 'navigate'
    | null;

  // AI Response
  aiResponse: string;
  nextQuestion: string | null;

  // Error handling
  error: string | null;
}

// Legacy DTO for backwards compatibility
export interface ServiceIntentResponseDto {
  understood: boolean;
  serviceType: string | null;
  serviceKey: string | null;
  location: string | null;
  urgency: 'immediate' | 'today' | 'this_week' | 'flexible' | null;
  frequency: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'flexible' | null;
  needsMoreInfo: boolean;
  nextQuestion: string | null;
  aiResponse: string;
  readyToSearch: boolean;
}

// Voice Chat Response
export class VoiceChatResponseDto {
  text: string;
  audio: string | null;
  intent: AIResponseDto;
}

// TTS Response
export class TextToSpeechResponseDto {
  audio: string | null;
}

// STT Response
export class SpeechToTextResponseDto {
  text: string | null;
  success: boolean;
}

// Image Analysis Response
export class ImageAnalysisResponseDto {
  serviceType: string | null;
  serviceKey: string | null;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  suggestions: string[];
  success: boolean;
}

// ===== CV BUILDER DTOs =====

export class CVChatRequestDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  conversationHistory?: { role: string; content: string }[];

  @IsOptional()
  currentCvData?: any;

  @IsOptional()
  userInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  @IsOptional()
  @IsString()
  locale?: string;
}

export interface CVExtractedDataDto {
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    location?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
  };
  headline?: string;
  summary?: string;
  newExperience?: {
    company: string;
    title: string;
    startDate?: string;
    endDate?: string;
    current: boolean;
    description: string;
    achievements: string[];
  }[];
  newEducation?: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate?: string;
    endDate?: string;
    current: boolean;
  }[];
  newSkills?: {
    name: string;
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  }[];
  newLanguages?: {
    language: string;
    proficiency: 'BASIC' | 'INTERMEDIATE' | 'FLUENT' | 'NATIVE';
  }[];
  newCertifications?: {
    name: string;
    issuer: string;
  }[];
}

export interface CVChatResponseDto {
  response: string;
  extractedData: CVExtractedDataDto | null;
  readyToSave: boolean;
  suggestedQuestions: string[];
}

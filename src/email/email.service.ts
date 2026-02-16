import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;
  private readonly logoUrl: string;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'sandbox.smtp.mailtrap.io'),
      port: this.configService.get('SMTP_PORT', 2525),
      auth: {
        user: this.configService.get('SMTP_USER', '3ba7b90592e2a7'),
        pass: this.configService.get('SMTP_PASS', '6a7434eaa04656'),
      },
    });

    this.fromEmail = this.configService.get('EMAIL_FROM', 'noreply@nextbee.co.uk');
    this.fromName = this.configService.get('EMAIL_FROM_NAME', 'NextBee');
    this.frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');
    this.logoUrl = 'https://res.cloudinary.com/dm3w1dqmg/image/upload/v1767882468/brand/nextbee/logo_primary.png';
  }

  // Translations
  private translations: Record<string, Record<string, string>> = {
    en: {
      footer: 'This email was sent by NextBee.',
      copyright: '© {year} NextBee Ltd.',
      welcomeTitle: 'Welcome, {name}',
      welcomeCustomer: 'Thanks for joining NextBee. You can now find trusted professionals in your area.',
      welcomeProvider: 'Thanks for joining NextBee. Complete your profile to start receiving quotes from customers.',
      welcomeCta: 'Browse services',
      welcomeCtaProvider: 'Complete profile',
      questions: 'Have questions? We\'re here to help.',
      verifyEmailTitle: 'Verify your email',
      verifyEmailText: 'Hi {name}, click the button below to verify your email address:',
      verifyEmailCta: 'Verify email',
      verifyEmailExpiry: 'This link expires in 24 hours. If you didn\'t sign up, ignore this email.',
      resetPasswordTitle: 'Reset your password',
      resetPasswordText: 'Hi {name}, we received a request to reset your password. Click below to create a new one:',
      resetPasswordCta: 'Reset password',
      resetPasswordExpiry: 'This link expires in 1 hour. If you didn\'t request this, ignore this email.',
      verificationCodeTitle: 'Your verification code',
      verificationCodeText: 'Use this code to verify your phone number:',
      verificationCodeExpiry: 'This code expires in 10 minutes.',
      quoteRequestTitle: 'New quote request',
      quoteRequestText: '{customer} is requesting a quote for {service}.',
      quoteRequestCta: 'Send quote',
      quoteRequestTip: 'Providers who respond quickly get more jobs.',
      quoteReceivedTitle: 'You received a quote',
      quoteReceivedText: '{provider} sent you a quote for {service}.',
      quoteReceivedCta: 'View quote',
      bookingConfirmedTitle: 'Booking confirmed',
      bookingConfirmedText: 'Your appointment with {provider} is confirmed.',
      bookingConfirmedCta: 'View booking',
      reviewTitle: 'Share your experience',
      reviewText: 'How was your {service} with {provider}? Your review helps others.',
      reviewCta: 'Leave review',
      service: 'Service',
      date: 'Date',
      address: 'Address',
      amount: 'Amount',
    },
    tr: {
      footer: 'Bu email NextBee tarafından gönderildi.',
      copyright: '© {year} NextBee Ltd.',
      welcomeTitle: 'Hoş geldin, {name}',
      welcomeCustomer: 'NextBee\'ye katıldığın için teşekkürler. Artık bölgendeki güvenilir profesyonelleri bulabilirsin.',
      welcomeProvider: 'NextBee\'ye katıldığın için teşekkürler. Profilini tamamlayarak müşterilerden teklif almaya başlayabilirsin.',
      welcomeCta: 'Hizmetlere göz at',
      welcomeCtaProvider: 'Profilini tamamla',
      questions: 'Sorularınız mı var? Bize her zaman ulaşabilirsin.',
      verifyEmailTitle: 'Email adresini doğrula',
      verifyEmailText: 'Merhaba {name}, email adresini doğrulamak için aşağıdaki butona tıkla:',
      verifyEmailCta: 'Email adresimi doğrula',
      verifyEmailExpiry: 'Bu link 24 saat geçerli. Eğer bu işlemi sen yapmadıysan, bu emaili görmezden gelebilirsin.',
      resetPasswordTitle: 'Şifreni sıfırla',
      resetPasswordText: 'Merhaba {name}, şifreni sıfırlamak için bir istek aldık. Yeni şifre oluşturmak için aşağıdaki butona tıkla:',
      resetPasswordCta: 'Şifremi sıfırla',
      resetPasswordExpiry: 'Bu link 1 saat geçerli. Eğer bu işlemi sen yapmadıysan, bu emaili görmezden gelebilirsin.',
      verificationCodeTitle: 'Doğrulama kodun',
      verificationCodeText: 'Telefon numaranı doğrulamak için bu kodu kullan:',
      verificationCodeExpiry: 'Bu kod 10 dakika içinde geçerliliğini yitirecek.',
      quoteRequestTitle: 'Yeni teklif talebi',
      quoteRequestText: '{customer} senden {service} için teklif istiyor.',
      quoteRequestCta: 'Teklif ver',
      quoteRequestTip: 'Hızlı yanıt veren profesyoneller daha fazla iş alıyor.',
      quoteReceivedTitle: 'Teklif aldın',
      quoteReceivedText: '{provider} sana {service} için teklif gönderdi.',
      quoteReceivedCta: 'Teklifi incele',
      bookingConfirmedTitle: 'Rezervasyonun onaylandı',
      bookingConfirmedText: '{provider} ile randevun ayarlandı.',
      bookingConfirmedCta: 'Rezervasyonu görüntüle',
      reviewTitle: 'Deneyimini paylaş',
      reviewText: '{provider} ile {service} deneyimin nasıldı? Değerlendirmen diğer kullanıcılara yardımcı olacak.',
      reviewCta: 'Değerlendir',
      service: 'Hizmet',
      date: 'Tarih',
      address: 'Adres',
      amount: 'Tutar',
    },
  };

  private t(key: string, locale: string = 'en', params: Record<string, string> = {}): string {
    const lang = this.translations[locale] || this.translations['en'];
    let text = lang[key] || this.translations['en'][key] || key;
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{${k}}`, 'g'), v);
    });
    return text;
  }

  // Clean, minimal base layout (Airbnb style)
  private baseLayout(content: string, locale: string = 'en'): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f7f7f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f7f7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <img src="${this.logoUrl}" alt="NextBee" width="120" style="display: block;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 32px 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px;">
              <div style="border-top: 1px solid #ebebeb;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 32px 32px;">
              <p style="margin: 0; font-size: 12px; color: #717171; line-height: 1.5;">
                ${this.t('footer', locale)}<br>
                ${this.t('copyright', locale, { year: new Date().getFullYear().toString() })}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
  }

  // Button component
  private button(text: string, url: string): string {
    return `
      <a href="${url}" style="display: inline-block; background-color: #222222; color: #ffffff; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">${text}</a>
    `;
  }

  // Send email
  async send(options: EmailOptions): Promise<boolean> {
    try {
      const result = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Email sent to ${options.to}: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  // Welcome email
  async sendWelcome(to: string, firstName: string, userType: 'CUSTOMER' | 'PROVIDER', locale: string = 'en'): Promise<boolean> {
    const isProvider = userType === 'PROVIDER';
    const ctaUrl = isProvider ? `${this.frontendUrl}/${locale}/profile/edit` : `${this.frontendUrl}/${locale}/services`;
    const ctaText = isProvider ? this.t('welcomeCtaProvider', locale) : this.t('welcomeCta', locale);

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #222222;">
        ${this.t('welcomeTitle', locale, { name: firstName })}
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #484848; line-height: 1.5;">
        ${isProvider ? this.t('welcomeProvider', locale) : this.t('welcomeCustomer', locale)}
      </p>
      <div style="margin: 0 0 24px 0;">
        ${this.button(ctaText, ctaUrl)}
      </div>
      <p style="margin: 0; font-size: 14px; color: #717171;">
        ${this.t('questions', locale)}
      </p>
    `;

    return this.send({
      to,
      subject: this.t('welcomeTitle', locale, { name: firstName }),
      html: this.baseLayout(content, locale),
    });
  }

  // Email verification
  async sendEmailVerification(to: string, firstName: string, verificationLink: string): Promise<boolean> {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #222222;">
        Email adresini doğrula
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #484848; line-height: 1.5;">
        Merhaba ${firstName}, email adresini doğrulamak için aşağıdaki butona tıkla:
      </p>
      <div style="margin: 0 0 24px 0;">
        ${this.button('Email adresimi doğrula', verificationLink)}
      </div>
      <p style="margin: 0; font-size: 14px; color: #717171;">
        Bu link 24 saat geçerli. Eğer bu işlemi sen yapmadıysan, bu emaili görmezden gelebilirsin.
      </p>
    `;

    return this.send({
      to,
      subject: 'Email adresini doğrula',
      html: this.baseLayout(content),
    });
  }

  // Password reset
  async sendPasswordReset(to: string, firstName: string, resetLink: string): Promise<boolean> {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #222222;">
        Şifreni sıfırla
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #484848; line-height: 1.5;">
        Merhaba ${firstName}, şifreni sıfırlamak için bir istek aldık. Yeni şifre oluşturmak için aşağıdaki butona tıkla:
      </p>
      <div style="margin: 0 0 24px 0;">
        ${this.button('Şifremi sıfırla', resetLink)}
      </div>
      <p style="margin: 0; font-size: 14px; color: #717171;">
        Bu link 1 saat geçerli. Eğer bu işlemi sen yapmadıysan, bu emaili görmezden gelebilirsin.
      </p>
    `;

    return this.send({
      to,
      subject: 'Şifreni sıfırla',
      html: this.baseLayout(content),
    });
  }

  // Phone verification code
  async sendPhoneVerificationCode(to: string, firstName: string, code: string): Promise<boolean> {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #222222;">
        Doğrulama kodun
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #484848; line-height: 1.5;">
        Telefon numaranı doğrulamak için bu kodu kullan:
      </p>
      <div style="background-color: #f7f7f7; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
        <span style="font-size: 32px; font-weight: 600; letter-spacing: 6px; color: #222222; font-family: monospace;">${code}</span>
      </div>
      <p style="margin: 0; font-size: 14px; color: #717171;">
        Bu kod 10 dakika içinde geçerliliğini yitirecek.
      </p>
    `;

    return this.send({
      to,
      subject: `${code} doğrulama kodun`,
      html: this.baseLayout(content),
      text: `Doğrulama kodun: ${code}. Bu kod 10 dakika içinde geçerliliğini yitirecek.`,
    });
  }

  // Email verification code
  async sendEmailVerificationCode(to: string, code: string): Promise<boolean> {
    const content = `
      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1a1a1a; text-align: center;">
        Doğrulama Kodun
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #666; line-height: 1.5; text-align: center;">
        Email adresini doğrulamak için aşağıdaki kodu gir
      </p>
      <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
        <span style="font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #1a1a1a; font-family: monospace;">${code}</span>
      </div>
      <p style="margin: 0; font-size: 13px; color: #999; text-align: center; line-height: 1.5;">
        Bu kod 10 dakika geçerli. Kodu kimseyle paylaşma.
      </p>
    `;

    return this.send({
      to,
      subject: `${code} - Doğrulama kodun`,
      html: this.baseLayout(content),
      text: `Doğrulama kodun: ${code}. Bu kod 10 dakika geçerli.`,
    });
  }

  // New quote request (for provider)
  async sendNewQuoteRequest(
    to: string,
    providerName: string,
    serviceName: string,
    customerName: string,
    description: string,
    quoteLink: string,
  ): Promise<boolean> {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #222222;">
        Yeni teklif talebi
      </h1>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #484848; line-height: 1.5;">
        ${customerName} senden <strong>${serviceName}</strong> için teklif istiyor.
      </p>
      <div style="background-color: #f7f7f7; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
        <p style="margin: 0; font-size: 14px; color: #484848; line-height: 1.5;">${description}</p>
      </div>
      <div style="margin: 0 0 24px 0;">
        ${this.button('Teklif ver', quoteLink)}
      </div>
      <p style="margin: 0; font-size: 14px; color: #717171;">
        Hızlı yanıt veren profesyoneller daha fazla iş alıyor.
      </p>
    `;

    return this.send({
      to,
      subject: `Yeni teklif talebi: ${serviceName}`,
      html: this.baseLayout(content),
    });
  }

  // Quote received (for customer)
  async sendQuoteReceived(
    to: string,
    customerName: string,
    providerName: string,
    serviceName: string,
    amount: number,
    quoteLink: string,
  ): Promise<boolean> {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #222222;">
        Teklif aldın
      </h1>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #484848; line-height: 1.5;">
        <strong>${providerName}</strong> sana ${serviceName} için teklif gönderdi.
      </p>
      <div style="background-color: #f7f7f7; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
        <span style="font-size: 28px; font-weight: 600; color: #222222;">£${amount.toFixed(2)}</span>
      </div>
      <div style="margin: 0 0 24px 0;">
        ${this.button('Teklifi incele', quoteLink)}
      </div>
    `;

    return this.send({
      to,
      subject: `${providerName} sana teklif gönderdi`,
      html: this.baseLayout(content),
    });
  }

  // Booking confirmation
  async sendBookingConfirmation(
    to: string,
    customerName: string,
    providerName: string,
    serviceName: string,
    scheduledDate: string,
    address: string,
    amount: number,
    bookingLink: string,
  ): Promise<boolean> {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #222222;">
        Rezervasyonun onaylandı
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #484848; line-height: 1.5;">
        <strong>${providerName}</strong> ile randevun ayarlandı.
      </p>
      <div style="background-color: #f7f7f7; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #717171;">Hizmet</p>
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #222222;">${serviceName}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #717171;">Tarih</p>
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #222222;">${scheduledDate}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #717171;">Adres</p>
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #222222;">${address}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #717171;">Tutar</p>
        <p style="margin: 0; font-size: 16px; color: #222222; font-weight: 600;">£${amount.toFixed(2)}</p>
      </div>
      <div style="margin: 0 0 24px 0;">
        ${this.button('Rezervasyonu görüntüle', bookingLink)}
      </div>
    `;

    return this.send({
      to,
      subject: `Rezervasyonun onaylandı: ${serviceName}`,
      html: this.baseLayout(content),
    });
  }

  // Review request
  async sendReviewRequest(
    to: string,
    customerName: string,
    providerName: string,
    serviceName: string,
    reviewLink: string,
  ): Promise<boolean> {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #222222;">
        Deneyimini paylaş
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #484848; line-height: 1.5;">
        ${providerName} ile ${serviceName} deneyimin nasıldı? Değerlendirmen diğer kullanıcılara yardımcı olacak.
      </p>
      <div style="margin: 0 0 24px 0;">
        ${this.button('Değerlendir', reviewLink)}
      </div>
    `;

    return this.send({
      to,
      subject: `${providerName} nasıldı?`,
      html: this.baseLayout(content),
    });
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email connection verified');
      return true;
    } catch (error) {
      this.logger.error('Email connection failed:', error);
      return false;
    }
  }
}

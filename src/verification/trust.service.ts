import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TrustScoreBreakdown {
  emailVerified: number;      // 10 points
  phoneVerified: number;      // 20 points (15 if VOIP)
  socialAccounts: number;     // Up to 30 points
  addressVerified: number;    // 20 points
  profileComplete: number;    // 10 points
  accountAge: number;         // Up to 10 points
  total: number;
}

@Injectable()
export class TrustService {
  private readonly logger = new Logger(TrustService.name);

  constructor(private prisma: PrismaService) {}

  // Calculate trust score for a user
  async calculateTrustScore(userId: string): Promise<TrustScoreBreakdown> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        socialAccounts: true,
        provider: true,
      },
    });

    if (!user) {
      return {
        emailVerified: 0,
        phoneVerified: 0,
        socialAccounts: 0,
        addressVerified: 0,
        profileComplete: 0,
        accountAge: 0,
        total: 0,
      };
    }

    const breakdown: TrustScoreBreakdown = {
      emailVerified: 0,
      phoneVerified: 0,
      socialAccounts: 0,
      addressVerified: 0,
      profileComplete: 0,
      accountAge: 0,
      total: 0,
    };

    // Email verified: 10 points
    if (user.emailVerified) {
      breakdown.emailVerified = 10;
    }

    // Phone verified: 20 points (15 if VOIP)
    if (user.phoneVerified) {
      breakdown.phoneVerified = user.phoneIsVoip ? 15 : 20;
    }

    // Social accounts: up to 30 points
    // Google/Apple: 10 points each
    // LinkedIn: 15 points (professional network)
    for (const account of user.socialAccounts) {
      if (account.provider === 'GOOGLE') {
        breakdown.socialAccounts += 10;
      } else if (account.provider === 'APPLE') {
        breakdown.socialAccounts += 10;
      } else if (account.provider === 'LINKEDIN') {
        // LinkedIn gets more points, especially if has connections
        let linkedinScore = 15;
        if (account.connectionsCount && account.connectionsCount > 100) {
          linkedinScore += 5;
        }
        breakdown.socialAccounts += linkedinScore;
      }
    }
    // Cap social accounts at 30
    breakdown.socialAccounts = Math.min(breakdown.socialAccounts, 30);

    // Address verified: 20 points
    if (user.addressVerified) {
      breakdown.addressVerified = 20;
    }

    // Profile complete: 10 points
    const hasFirstName = !!user.firstName;
    const hasLastName = !!user.lastName;
    const hasAvatar = !!user.avatar;
    const hasPhone = !!user.phone;
    const hasPostcode = !!user.postcode;

    const profileFields = [hasFirstName, hasLastName, hasAvatar, hasPhone, hasPostcode];
    const completedFields = profileFields.filter(Boolean).length;
    breakdown.profileComplete = Math.round((completedFields / profileFields.length) * 10);

    // Account age: up to 10 points (1 point per month, max 10 months)
    const accountAgeMonths = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000),
    );
    breakdown.accountAge = Math.min(accountAgeMonths, 10);

    // Calculate total
    breakdown.total =
      breakdown.emailVerified +
      breakdown.phoneVerified +
      breakdown.socialAccounts +
      breakdown.addressVerified +
      breakdown.profileComplete +
      breakdown.accountAge;

    return breakdown;
  }

  // Update user's trust score in database
  async updateUserTrustScore(userId: string): Promise<number> {
    const breakdown = await this.calculateTrustScore(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        overallTrustScore: breakdown.total,
        socialTrustScore: breakdown.socialAccounts,
      },
    });

    // Also update provider trust score if applicable
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (provider) {
      await this.prisma.provider.update({
        where: { id: provider.id },
        data: { trustScore: breakdown.total },
      });
    }

    return breakdown.total;
  }

  // Get trust badges for display
  getTrustBadges(user: {
    emailVerified: boolean;
    phoneVerified: boolean;
    phoneIsVoip: boolean | null;
    addressVerified: boolean;
    socialAccounts: { provider: string }[];
  }): string[] {
    const badges: string[] = [];

    if (user.emailVerified) {
      badges.push('EMAIL_VERIFIED');
    }

    if (user.phoneVerified) {
      badges.push('PHONE_VERIFIED');
    }

    if (user.addressVerified) {
      badges.push('ADDRESS_VERIFIED');
    }

    // Social badges
    const providers = user.socialAccounts.map((a) => a.provider);
    if (providers.includes('GOOGLE')) {
      badges.push('GOOGLE_CONNECTED');
    }
    if (providers.includes('APPLE')) {
      badges.push('APPLE_CONNECTED');
    }
    if (providers.includes('LINKEDIN')) {
      badges.push('LINKEDIN_CONNECTED');
    }

    return badges;
  }
}

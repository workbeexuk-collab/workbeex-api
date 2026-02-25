import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationStatus, SkillLevel, LanguageProficiency, LocationType, SalaryPeriod } from '@prisma/client';

interface CreateCandidateProfileDto {
  headline?: string;
  summary?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  expectedSalary?: number;
  salaryCurrency?: string;
  salaryPeriod?: SalaryPeriod;
  openToWork?: boolean;
  openToRemote?: boolean;
}

interface EducationDto {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: Date;
  endDate?: Date;
  current?: boolean;
  grade?: string;
  description?: string;
}

interface ExperienceDto {
  company: string;
  title: string;
  location?: string;
  locationType?: LocationType;
  startDate: Date;
  endDate?: Date;
  current?: boolean;
  description?: string;
  achievements?: string[];
}

interface SkillDto {
  name: string;
  level?: SkillLevel;
  yearsOfExperience?: number;
}

interface CertificationDto {
  name: string;
  issuingOrg: string;
  issueDate?: Date;
  expiryDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
}

interface LanguageDto {
  language: string;
  proficiency?: LanguageProficiency;
}

@Injectable()
export class CandidatesService {
  constructor(private prisma: PrismaService) {}

  // Get or create candidate profile
  async getOrCreateProfile(userId: string) {
    let profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        education: { orderBy: { endDate: 'desc' } },
        experience: { orderBy: { startDate: 'desc' } },
        skills: true,
        certifications: { orderBy: { issueDate: 'desc' } },
        languages: true,
      },
    });

    if (!profile) {
      profile = await this.prisma.candidateProfile.create({
        data: { userId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
          education: true,
          experience: true,
          skills: true,
          certifications: true,
          languages: true,
        },
      });
    }

    return profile;
  }

  // Update candidate profile
  async updateProfile(userId: string, data: CreateCandidateProfileDto) {
    const profile = await this.getOrCreateProfile(userId);

    return this.prisma.candidateProfile.update({
      where: { id: profile.id },
      data: {
        headline: data.headline,
        summary: data.summary,
        phone: data.phone,
        location: data.location,
        linkedinUrl: data.linkedinUrl,
        portfolioUrl: data.portfolioUrl,
        expectedSalary: data.expectedSalary,
        salaryCurrency: data.salaryCurrency,
        salaryPeriod: data.salaryPeriod,
        openToWork: data.openToWork,
        openToRemote: data.openToRemote,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        education: { orderBy: { endDate: 'desc' } },
        experience: { orderBy: { startDate: 'desc' } },
        skills: true,
        certifications: true,
        languages: true,
      },
    });
  }

  // Upload CV
  async uploadCV(userId: string, cvUrl: string, fileName: string) {
    const profile = await this.getOrCreateProfile(userId);

    return this.prisma.candidateProfile.update({
      where: { id: profile.id },
      data: {
        cvUrl,
        cvFileName: fileName,
      },
    });
  }

  // === EDUCATION ===
  async addEducation(userId: string, data: EducationDto) {
    const profile = await this.getOrCreateProfile(userId);

    return this.prisma.education.create({
      data: {
        candidateId: profile.id,
        ...data,
      },
    });
  }

  async updateEducation(userId: string, educationId: string, data: EducationDto) {
    const education = await this.prisma.education.findUnique({
      where: { id: educationId },
      include: { candidate: true },
    });

    if (!education || education.candidate.userId !== userId) {
      throw new ForbiddenException('Cannot update this education');
    }

    return this.prisma.education.update({
      where: { id: educationId },
      data,
    });
  }

  async deleteEducation(userId: string, educationId: string) {
    const education = await this.prisma.education.findUnique({
      where: { id: educationId },
      include: { candidate: true },
    });

    if (!education || education.candidate.userId !== userId) {
      throw new ForbiddenException('Cannot delete this education');
    }

    await this.prisma.education.delete({ where: { id: educationId } });
    return { success: true };
  }

  // === EXPERIENCE ===
  async addExperience(userId: string, data: ExperienceDto) {
    const profile = await this.getOrCreateProfile(userId);

    return this.prisma.workExperience.create({
      data: {
        candidateId: profile.id,
        ...data,
      },
    });
  }

  async updateExperience(userId: string, experienceId: string, data: ExperienceDto) {
    const experience = await this.prisma.workExperience.findUnique({
      where: { id: experienceId },
      include: { candidate: true },
    });

    if (!experience || experience.candidate.userId !== userId) {
      throw new ForbiddenException('Cannot update this experience');
    }

    return this.prisma.workExperience.update({
      where: { id: experienceId },
      data,
    });
  }

  async deleteExperience(userId: string, experienceId: string) {
    const experience = await this.prisma.workExperience.findUnique({
      where: { id: experienceId },
      include: { candidate: true },
    });

    if (!experience || experience.candidate.userId !== userId) {
      throw new ForbiddenException('Cannot delete this experience');
    }

    await this.prisma.workExperience.delete({ where: { id: experienceId } });
    return { success: true };
  }

  // === SKILLS ===
  async addSkill(userId: string, data: SkillDto) {
    const profile = await this.getOrCreateProfile(userId);

    return this.prisma.candidateSkill.upsert({
      where: {
        candidateId_name: {
          candidateId: profile.id,
          name: data.name,
        },
      },
      update: {
        level: data.level || 'INTERMEDIATE',
        yearsOfExperience: data.yearsOfExperience,
      },
      create: {
        candidateId: profile.id,
        name: data.name,
        level: data.level || 'INTERMEDIATE',
        yearsOfExperience: data.yearsOfExperience,
      },
    });
  }

  async updateSkill(userId: string, skillId: string, data: SkillDto) {
    const skill = await this.prisma.candidateSkill.findUnique({
      where: { id: skillId },
      include: { candidate: true },
    });

    if (!skill || skill.candidate.userId !== userId) {
      throw new ForbiddenException('Cannot update this skill');
    }

    return this.prisma.candidateSkill.update({
      where: { id: skillId },
      data,
    });
  }

  async deleteSkill(userId: string, skillId: string) {
    const skill = await this.prisma.candidateSkill.findUnique({
      where: { id: skillId },
      include: { candidate: true },
    });

    if (!skill || skill.candidate.userId !== userId) {
      throw new ForbiddenException('Cannot delete this skill');
    }

    await this.prisma.candidateSkill.delete({ where: { id: skillId } });
    return { success: true };
  }

  // === CERTIFICATIONS ===
  async addCertification(userId: string, data: CertificationDto) {
    const profile = await this.getOrCreateProfile(userId);

    return this.prisma.certification.create({
      data: {
        candidateId: profile.id,
        ...data,
      },
    });
  }

  async deleteCertification(userId: string, certId: string) {
    const cert = await this.prisma.certification.findUnique({
      where: { id: certId },
      include: { candidate: true },
    });

    if (!cert || cert.candidate.userId !== userId) {
      throw new ForbiddenException('Cannot delete this certification');
    }

    await this.prisma.certification.delete({ where: { id: certId } });
    return { success: true };
  }

  // === LANGUAGES ===
  async addLanguage(userId: string, data: LanguageDto) {
    const profile = await this.getOrCreateProfile(userId);

    return this.prisma.candidateLanguage.create({
      data: {
        candidateId: profile.id,
        language: data.language,
        proficiency: data.proficiency || 'INTERMEDIATE',
      },
    });
  }

  async deleteLanguage(userId: string, langId: string) {
    const lang = await this.prisma.candidateLanguage.findUnique({
      where: { id: langId },
      include: { candidate: true },
    });

    if (!lang || lang.candidate.userId !== userId) {
      throw new ForbiddenException('Cannot delete this language');
    }

    await this.prisma.candidateLanguage.delete({ where: { id: langId } });
    return { success: true };
  }

  // === JOB APPLICATIONS ===
  async applyToJob(userId: string, jobId: string, coverLetter?: string) {
    const profile = await this.getOrCreateProfile(userId);

    // Check if job exists and is active
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status !== 'ACTIVE') {
      throw new NotFoundException('Job not found or not available');
    }

    // Check if already applied
    const existing = await this.prisma.jobApplication.findUnique({
      where: {
        jobId_candidateId: {
          jobId,
          candidateId: profile.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('You have already applied to this job');
    }

    return this.prisma.jobApplication.create({
      data: {
        jobId,
        candidateId: profile.id,
        coverLetter,
        status: 'PENDING',
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            employer: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async getMyApplications(userId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return [];
    }

    return this.prisma.jobApplication.findMany({
      where: { candidateId: profile.id },
      orderBy: { appliedAt: 'desc' },
      include: {
        job: {
          include: {
            employer: {
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

  async withdrawApplication(userId: string, applicationId: string) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { candidate: true },
    });

    if (!application || application.candidate.userId !== userId) {
      throw new ForbiddenException('Cannot withdraw this application');
    }

    return this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: 'WITHDRAWN' },
    });
  }

  // Search candidates (for employers)
  async searchCandidates(filters: {
    query?: string;
    skills?: string[];
    location?: string;
    experienceLevel?: 'JUNIOR' | 'MID' | 'SENIOR';
    openToRemote?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { query, skills, location, experienceLevel, openToRemote, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      openToWork: true,
    };

    // Search in headline, summary
    if (query) {
      where.OR = [
        { headline: { contains: query, mode: 'insensitive' } },
        { summary: { contains: query, mode: 'insensitive' } },
        { skills: { some: { name: { contains: query, mode: 'insensitive' } } } },
        { experience: { some: { title: { contains: query, mode: 'insensitive' } } } },
      ];
    }

    // Filter by location
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Filter by openToRemote
    if (openToRemote !== undefined) {
      where.openToRemote = openToRemote;
    }

    // Filter by skills
    if (skills && skills.length > 0) {
      where.skills = {
        some: {
          name: { in: skills, mode: 'insensitive' },
        },
      };
    }

    // Experience level filter based on years of experience
    if (experienceLevel) {
      const minYears = experienceLevel === 'JUNIOR' ? 0 : experienceLevel === 'MID' ? 2 : 5;
      const maxYears = experienceLevel === 'JUNIOR' ? 2 : experienceLevel === 'MID' ? 5 : 100;
      // This would need subquery or post-filtering for actual experience years
    }

    const [candidates, total] = await Promise.all([
      this.prisma.candidateProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          skills: true,
          experience: {
            take: 2,
            orderBy: { startDate: 'desc' },
          },
          education: {
            take: 1,
            orderBy: { endDate: 'desc' },
          },
        },
      }),
      this.prisma.candidateProfile.count({ where }),
    ]);

    return {
      data: candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // AI-powered candidate search (for chat)
  async aiSearchCandidates(criteria: {
    position?: string;
    skills?: string[];
    location?: string;
    experienceYears?: number;
    remoteOk?: boolean;
  }) {
    const { position, skills, location, experienceYears, remoteOk } = criteria;

    const where: any = {};

    // Prefer candidates open to work, but don't exclude others
    // openToWork is used for ordering, not filtering

    // Build search conditions - combine position and skills search
    const orConditions: any[] = [];

    if (position) {
      // Search in multiple fields for position
      orConditions.push(
        { headline: { contains: position, mode: 'insensitive' } },
        { summary: { contains: position, mode: 'insensitive' } },
        { experience: { some: { title: { contains: position, mode: 'insensitive' } } } },
      );

      // Also search skills for position keyword
      orConditions.push({
        skills: { some: { name: { contains: position, mode: 'insensitive' } } },
      });
    }

    if (skills && skills.length > 0) {
      // Search for each skill
      for (const skill of skills) {
        orConditions.push({
          skills: { some: { name: { contains: skill.trim(), mode: 'insensitive' } } },
        });
        // Also search in headline and summary
        orConditions.push(
          { headline: { contains: skill.trim(), mode: 'insensitive' } },
          { summary: { contains: skill.trim(), mode: 'insensitive' } },
        );
      }
    }

    if (orConditions.length > 0) {
      where.OR = orConditions;
    }

    // Only filter by location if it's a real city name (skip generic terms)
    const skipLocationKeywords = ['remote', 'anywhere', 'yok', 'herhangi', 'farketmez', 'none', 'any', 'hepsi', 'all'];
    if (location && location.trim() && !skipLocationKeywords.some(kw => location.toLowerCase().includes(kw))) {
      where.location = { contains: location.trim(), mode: 'insensitive' };
    }

    // Only filter by remote if explicitly set
    if (remoteOk === true) {
      where.openToRemote = true;
    }

    const candidates = await this.prisma.candidateProfile.findMany({
      where,
      take: 10,
      orderBy: [{ openToWork: 'desc' }, { updatedAt: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true,
          },
        },
        skills: true,
        experience: {
          take: 2,
          orderBy: { startDate: 'desc' },
        },
        education: {
          take: 1,
          orderBy: { endDate: 'desc' },
        },
      },
    });

    return candidates;
  }

  // Get candidate profile by ID (for employers viewing applicants)
  async getCandidateProfile(candidateId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        education: { orderBy: { endDate: 'desc' } },
        experience: { orderBy: { startDate: 'desc' } },
        skills: true,
        certifications: { orderBy: { issueDate: 'desc' } },
        languages: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Candidate profile not found');
    }

    return profile;
  }
}

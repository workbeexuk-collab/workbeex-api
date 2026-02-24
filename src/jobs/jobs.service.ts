import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus, LocationType, EmploymentType, ExperienceLevel } from '@prisma/client';

interface CreateJobDto {
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  location?: string;
  locationType?: LocationType;
  employmentType?: EmploymentType;
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  skills?: string[];
  benefits?: string[];
  category?: string;
  applicationDeadline?: Date;
}

interface UpdateJobDto extends Partial<CreateJobDto> {
  status?: JobStatus;
}

interface JobFilters {
  search?: string;
  category?: string;
  locationType?: LocationType;
  employmentType?: EmploymentType;
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  status?: JobStatus;
  location?: string;
}

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  // Create a new job listing
  async createJob(employerId: string, data: CreateJobDto) {
    return this.prisma.job.create({
      data: {
        employerId,
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        responsibilities: data.responsibilities,
        location: data.location,
        locationType: data.locationType || 'ONSITE',
        employmentType: data.employmentType || 'FULL_TIME',
        experienceLevel: data.experienceLevel || 'MID',
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        salaryCurrency: data.salaryCurrency || 'GBP',
        salaryPeriod: data.salaryPeriod as any || 'YEARLY',
        skills: data.skills || [],
        benefits: data.benefits || [],
        category: data.category,
        applicationDeadline: data.applicationDeadline,
        status: 'ACTIVE',
      },
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  // Get all jobs with filters
  async getJobs(
    filters: JobFilters,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      status: filters.status || 'ACTIVE',
    };

    if (filters.search) {
      // Split search into words for better matching
      const searchWords = filters.search.split(/\s+/).filter(w => w.length > 1);
      const skillVariants = searchWords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      // Also add original search terms
      skillVariants.push(filters.search);
      searchWords.forEach(w => skillVariants.push(w, w.toLowerCase(), w.toUpperCase()));
      const uniqueSkills = [...new Set(skillVariants)];

      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { skills: { hasSome: uniqueSkills } },
        // Also search each word individually in title
        ...searchWords.map(word => ({ title: { contains: word, mode: 'insensitive' as const } })),
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.locationType) {
      where.locationType = filters.locationType;
    }

    if (filters.employmentType) {
      where.employmentType = filters.employmentType;
    }

    if (filters.experienceLevel) {
      where.experienceLevel = filters.experienceLevel;
    }

    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters.salaryMin) {
      where.salaryMax = { gte: filters.salaryMin };
    }

    if (filters.salaryMax) {
      where.salaryMin = { lte: filters.salaryMax };
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          _count: {
            select: { applications: true },
          },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get job by ID
  async getJobById(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true,
          },
        },
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Increment view count
    await this.prisma.job.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return job;
  }

  // Update job
  async updateJob(id: string, userId: string, data: UpdateJobDto) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.employerId !== userId) {
      throw new ForbiddenException('You can only update your own jobs');
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        ...data,
        salaryPeriod: data.salaryPeriod as any,
      },
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
    });
  }

  // Delete job
  async deleteJob(id: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.employerId !== userId) {
      throw new ForbiddenException('You can only delete your own jobs');
    }

    await this.prisma.job.delete({ where: { id } });

    return { success: true };
  }

  // Get employer's jobs
  async getEmployerJobs(employerId: string, status?: JobStatus) {
    const where: any = { employerId };
    if (status) {
      where.status = status;
    }

    return this.prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  // Get job applications (for employer)
  async getJobApplications(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.employerId !== userId) {
      throw new ForbiddenException('You can only view applications for your own jobs');
    }

    return this.prisma.jobApplication.findMany({
      where: { jobId },
      orderBy: { appliedAt: 'desc' },
      include: {
        candidate: {
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
        },
      },
    });
  }

  // Update application status (for employer)
  async updateApplicationStatus(
    applicationId: string,
    userId: string,
    status: string,
    notes?: string,
    rating?: number,
  ) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.job.employerId !== userId) {
      throw new ForbiddenException('You can only update applications for your own jobs');
    }

    return this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        status: status as any,
        notes,
        rating,
        reviewedAt: new Date(),
      },
    });
  }

  // Get job categories
  async getCategories() {
    const categories = await this.prisma.job.groupBy({
      by: ['category'],
      where: {
        status: 'ACTIVE',
        category: { not: null },
      },
      _count: true,
    });

    return categories
      .filter((c) => c.category)
      .map((c) => ({
        name: c.category,
        count: c._count,
      }));
  }
}

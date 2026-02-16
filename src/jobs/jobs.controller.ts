import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JobsService } from './jobs.service';

interface AuthUser {
  id: string;
  email: string;
  type: string;
}

@Controller('jobs')
export class JobsController {
  constructor(private jobsService: JobsService) {}

  // Create a new job (employer only)
  @Post()
  @UseGuards(JwtAuthGuard)
  async createJob(@CurrentUser() user: AuthUser, @Body() body: any) {
    const job = await this.jobsService.createJob(user.id, body);
    return {
      success: true,
      data: job,
    };
  }

  // Get all jobs (public)
  @Get()
  @Public()
  async getJobs(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('locationType') locationType?: string,
    @Query('employmentType') employmentType?: string,
    @Query('experienceLevel') experienceLevel?: string,
    @Query('salaryMin') salaryMin?: string,
    @Query('salaryMax') salaryMax?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.jobsService.getJobs(
      {
        search,
        category,
        locationType: locationType as any,
        employmentType: employmentType as any,
        experienceLevel: experienceLevel as any,
        salaryMin: salaryMin ? parseFloat(salaryMin) : undefined,
        salaryMax: salaryMax ? parseFloat(salaryMax) : undefined,
      },
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );

    return {
      success: true,
      data: result.jobs,
      pagination: result.pagination,
    };
  }

  // Get job categories
  @Get('categories')
  @Public()
  async getCategories() {
    const categories = await this.jobsService.getCategories();
    return {
      success: true,
      data: categories,
    };
  }

  // Get my jobs (employer)
  @Get('my-jobs')
  @UseGuards(JwtAuthGuard)
  async getMyJobs(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
  ) {
    const jobs = await this.jobsService.getEmployerJobs(user.id, status as any);
    return {
      success: true,
      data: jobs,
    };
  }

  // Get job by ID (public)
  @Get(':id')
  @Public()
  async getJobById(@Param('id') id: string) {
    const job = await this.jobsService.getJobById(id);
    return {
      success: true,
      data: job,
    };
  }

  // Update job
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateJob(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const job = await this.jobsService.updateJob(id, user.id, body);
    return {
      success: true,
      data: job,
    };
  }

  // Delete job
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteJob(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.jobsService.deleteJob(id, user.id);
    return {
      success: true,
    };
  }

  // Get job applications (employer)
  @Get(':id/applications')
  @UseGuards(JwtAuthGuard)
  async getJobApplications(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const applications = await this.jobsService.getJobApplications(id, user.id);
    return {
      success: true,
      data: applications,
    };
  }

  // Update application status
  @Put('applications/:applicationId/status')
  @UseGuards(JwtAuthGuard)
  async updateApplicationStatus(
    @CurrentUser() user: AuthUser,
    @Param('applicationId') applicationId: string,
    @Body() body: { status: string; notes?: string; rating?: number },
  ) {
    const application = await this.jobsService.updateApplicationStatus(
      applicationId,
      user.id,
      body.status,
      body.notes,
      body.rating,
    );
    return {
      success: true,
      data: application,
    };
  }
}

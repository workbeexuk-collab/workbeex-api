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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CandidatesService } from './candidates.service';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { Public } from '../common/decorators/public.decorator';

interface AuthUser {
  id: string;
  email: string;
  type: string;
}

@Controller('candidates')
export class CandidatesController {
  constructor(
    private candidatesService: CandidatesService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // === SEARCH (Public) ===

  // Search candidates (for employers)
  @Get('search')
  async searchCandidates(
    @Query('query') query?: string,
    @Query('skills') skills?: string,
    @Query('location') location?: string,
    @Query('experienceLevel') experienceLevel?: 'JUNIOR' | 'MID' | 'SENIOR',
    @Query('openToRemote') openToRemote?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.candidatesService.searchCandidates({
      query,
      skills: skills ? skills.split(',').map((s) => s.trim()) : undefined,
      location,
      experienceLevel,
      openToRemote: openToRemote === 'true' ? true : openToRemote === 'false' ? false : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
    return {
      success: true,
      ...result,
    };
  }

  // AI-powered candidate search (public - used by AI chat employer flow)
  @Public()
  @Post('ai-search')
  async aiSearchCandidates(
    @Body() body: {
      position?: string;
      skills?: string[];
      location?: string;
      experienceYears?: number;
      remoteOk?: boolean;
    },
  ) {
    const candidates = await this.candidatesService.aiSearchCandidates(body);
    return {
      success: true,
      data: candidates,
    };
  }

  // === PROFILE ===

  // Get my candidate profile
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getMyProfile(@CurrentUser() user: AuthUser) {
    const profile = await this.candidatesService.getOrCreateProfile(user.id);
    return {
      success: true,
      data: profile,
    };
  }

  // Update my profile
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@CurrentUser() user: AuthUser, @Body() body: any) {
    const profile = await this.candidatesService.updateProfile(user.id, body);
    return {
      success: true,
      data: profile,
    };
  }

  // Upload CV
  @Post('profile/cv')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF files are allowed'), false);
        }
      },
    }),
  )
  async uploadCV(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.cloudinaryService.uploadFile(file, 'cvs');
    await this.candidatesService.uploadCV(user.id, result.url, file.originalname);

    return {
      success: true,
      data: {
        url: result.url,
        fileName: file.originalname,
      },
    };
  }

  // Get candidate profile by ID (for employers)
  @Public()
  @Get('profile/:id')
  async getCandidateProfile(@Param('id') id: string) {
    const profile = await this.candidatesService.getCandidateProfile(id);
    return {
      success: true,
      data: profile,
    };
  }

  // === EDUCATION ===

  @Post('education')
  async addEducation(@CurrentUser() user: AuthUser, @Body() body: any) {
    const education = await this.candidatesService.addEducation(user.id, body);
    return {
      success: true,
      data: education,
    };
  }

  @Put('education/:id')
  async updateEducation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const education = await this.candidatesService.updateEducation(user.id, id, body);
    return {
      success: true,
      data: education,
    };
  }

  @Delete('education/:id')
  async deleteEducation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.candidatesService.deleteEducation(user.id, id);
    return { success: true };
  }

  // === EXPERIENCE ===

  @Post('experience')
  async addExperience(@CurrentUser() user: AuthUser, @Body() body: any) {
    const experience = await this.candidatesService.addExperience(user.id, body);
    return {
      success: true,
      data: experience,
    };
  }

  @Put('experience/:id')
  async updateExperience(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const experience = await this.candidatesService.updateExperience(user.id, id, body);
    return {
      success: true,
      data: experience,
    };
  }

  @Delete('experience/:id')
  async deleteExperience(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.candidatesService.deleteExperience(user.id, id);
    return { success: true };
  }

  // === SKILLS ===

  @Post('skills')
  async addSkill(@CurrentUser() user: AuthUser, @Body() body: any) {
    const skill = await this.candidatesService.addSkill(user.id, body);
    return {
      success: true,
      data: skill,
    };
  }

  @Put('skills/:id')
  async updateSkill(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const skill = await this.candidatesService.updateSkill(user.id, id, body);
    return {
      success: true,
      data: skill,
    };
  }

  @Delete('skills/:id')
  async deleteSkill(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.candidatesService.deleteSkill(user.id, id);
    return { success: true };
  }

  // === CERTIFICATIONS ===

  @Post('certifications')
  async addCertification(@CurrentUser() user: AuthUser, @Body() body: any) {
    const cert = await this.candidatesService.addCertification(user.id, body);
    return {
      success: true,
      data: cert,
    };
  }

  @Delete('certifications/:id')
  async deleteCertification(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.candidatesService.deleteCertification(user.id, id);
    return { success: true };
  }

  // === LANGUAGES ===

  @Post('languages')
  async addLanguage(@CurrentUser() user: AuthUser, @Body() body: any) {
    const lang = await this.candidatesService.addLanguage(user.id, body);
    return {
      success: true,
      data: lang,
    };
  }

  @Delete('languages/:id')
  async deleteLanguage(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.candidatesService.deleteLanguage(user.id, id);
    return { success: true };
  }

  // === APPLICATIONS ===

  @Post('apply/:jobId')
  async applyToJob(
    @CurrentUser() user: AuthUser,
    @Param('jobId') jobId: string,
    @Body() body: { coverLetter?: string },
  ) {
    const application = await this.candidatesService.applyToJob(
      user.id,
      jobId,
      body.coverLetter,
    );
    return {
      success: true,
      data: application,
    };
  }

  @Get('applications')
  async getMyApplications(@CurrentUser() user: AuthUser) {
    const applications = await this.candidatesService.getMyApplications(user.id);
    return {
      success: true,
      data: applications,
    };
  }

  @Post('applications/:id/withdraw')
  async withdrawApplication(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const application = await this.candidatesService.withdrawApplication(user.id, id);
    return {
      success: true,
      data: application,
    };
  }
}

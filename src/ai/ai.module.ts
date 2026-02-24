import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { VoiceGateway } from './voice.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';
import { ProvidersModule } from '../providers/providers.module';
import { CandidatesModule } from '../candidates/candidates.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, JobsModule, ProvidersModule, CandidatesModule, UploadsModule, AuthModule],
  controllers: [AiController],
  providers: [AiService, VoiceGateway],
  exports: [AiService],
})
export class AiModule {}

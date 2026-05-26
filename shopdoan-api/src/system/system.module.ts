import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { SystemService } from '@/system/system.service';

@Module({
  imports: [PrismaModule],
  providers: [SystemService],
})
export class SystemModule {}

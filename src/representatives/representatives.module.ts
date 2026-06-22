import { Module, forwardRef } from '@nestjs/common';
import { RepresentativesController } from './representatives.controller';
import { RepresentativesService } from './representatives.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [RepresentativesController],
  providers: [RepresentativesService],
  exports: [RepresentativesService],
})
export class RepresentativesModule {}

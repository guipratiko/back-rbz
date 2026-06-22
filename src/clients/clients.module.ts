import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { CnpjLookupService } from './cnpj-lookup.service';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { PipelineModule } from '../pipeline/pipeline.module';

@Module({
  imports: [OpportunitiesModule, PipelineModule],
  controllers: [ClientsController],
  providers: [ClientsService, CnpjLookupService],
  exports: [ClientsService],
})
export class ClientsModule {}

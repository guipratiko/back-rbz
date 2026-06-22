import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PipelineStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOpportunityDto, UpdateOpportunityDto, UpdatePipelineDto } from './dto/opportunity.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { opportunityScope } from '../common/utils/data-scope.util';
import { PipelineService } from '../pipeline/pipeline.service';

@Injectable()
export class OpportunitiesService {
  constructor(
    private prisma: PrismaService,
    private pipelineService: PipelineService,
  ) {}

  private scope(user: AuthUser): Prisma.OpportunityWhereInput {
    return opportunityScope(user);
  }

  findAll(user: AuthUser) {
    return this.prisma.opportunity.findMany({
      where: this.scope(user),
      include: {
        client: { select: { id: true, nomeFantasia: true, cidade: true, estado: true } },
        brand: { select: { id: true, nome: true } },
        collection: { select: { id: true, nome: true, ano: true } },
        representative: { select: { id: true, nome: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, ...this.scope(user) },
      include: { client: true, brand: true, collection: true, representative: true },
    });
    if (!opp) throw new NotFoundException('Oportunidade não encontrada');
    const percentual = Number(opp.meta) > 0 ? (Number(opp.valorVendido) / Number(opp.meta)) * 100 : 0;
    return { ...opp, percentualAtingido: Math.round(percentual * 100) / 100 };
  }

  create(dto: CreateOpportunityDto) {
    return this.prisma.opportunity.create({
      data: {
        ...dto,
        meta: dto.meta ?? 0,
        orcamento: dto.orcamento ?? 0,
        ultimaInteracao: new Date(),
      },
      include: { client: true, brand: true, collection: true },
    });
  }

  async update(id: string, dto: UpdateOpportunityDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.opportunity.update({
      where: { id },
      data: { ...dto, ultimaInteracao: new Date() },
    });
  }

  async updatePipeline(id: string, dto: UpdatePipelineDto, user: AuthUser) {
    await this.findOne(id, user);
    const statusMap: Partial<Record<PipelineStage, string>> = {
      FATURADO: 'FATURADO',
      PERDIDO: 'PERDIDO',
      ORCAMENTO_ENVIADO: 'ORCAMENTO_ENVIADO',
      PEDIDO_CONFIRMADO: 'PEDIDO_CONFIRMADO',
      NEGOCIACAO: 'EM_NEGOCIACAO',
      ATENDIMENTO: 'EM_ATENDIMENTO',
      AGENDADO: 'AGENDADA',
    };
    return this.prisma.opportunity.update({
      where: { id },
      data: {
        pipelineStage: dto.pipelineStage,
        lossReason: dto.lossReason,
        status: (statusMap[dto.pipelineStage] as never) || undefined,
        ultimaInteracao: new Date(),
        dataFechamento: ['FATURADO', 'PERDIDO'].includes(dto.pipelineStage) ? new Date() : undefined,
      },
    });
  }

  async generateForClient(clientId: string, user: AuthUser, pipelineColumnId?: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { brands: true },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');

    const collections = await this.prisma.collection.findMany({
      where: { status: { in: ['ATIVA', 'PLANEJADA'] } },
    });

    const created = [];
    for (const brand of client.brands) {
      for (const collection of collections) {
        const exists = await this.prisma.opportunity.findUnique({
          where: {
            clientId_brandId_collectionId: {
              clientId,
              brandId: brand.brandId,
              collectionId: collection.id,
            },
          },
        });
        if (!exists) {
          const opp = await this.prisma.opportunity.create({
            data: {
              clientId,
              brandId: brand.brandId,
              collectionId: collection.id,
              representativeId: client.representativeId,
            },
          });
          created.push(opp);
        }
      }
    }

    if (created.length) {
      await this.pipelineService.placeOpportunities(
        user,
        created.map((o) => o.id),
        pipelineColumnId,
      );
    }

    return { created: created.length, opportunities: created };
  }

  remove(id: string, user: AuthUser) {
    return this.findOne(id, user).then(() =>
      this.prisma.opportunity.delete({ where: { id } }),
    );
  }
}

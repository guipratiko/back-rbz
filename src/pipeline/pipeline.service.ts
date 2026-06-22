import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PipelineStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { opportunityScope } from '../common/utils/data-scope.util';
import {
  CreatePipelineColumnDto,
  MovePipelineCardDto,
  UpdatePipelineColumnDto,
} from './dto/pipeline.dto';

const DEFAULT_COLUMNS = [
  'Prospect',
  'Primeiro Contato',
  'Agendado',
  'Atendimento',
  'Negociação',
  'Orçamento Enviado',
  'Pedido Confirmado',
  'Faturado',
  'Perdido',
];

const STAGE_ORDER: PipelineStage[] = [
  'PROSPECT',
  'PRIMEIRO_CONTATO',
  'AGENDADO',
  'ATENDIMENTO',
  'NEGOCIACAO',
  'ORCAMENTO_ENVIADO',
  'PEDIDO_CONFIRMADO',
  'FATURADO',
  'PERDIDO',
];

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  async getColumns(user: AuthUser) {
    await this.ensureDefaultColumns(user.id);
    return this.prisma.pipelineColumn.findMany({
      where: { userId: user.id },
      orderBy: { position: 'asc' },
    });
  }

  async createColumn(user: AuthUser, dto: CreatePipelineColumnDto) {
    const last = await this.prisma.pipelineColumn.findFirst({
      where: { userId: user.id },
      orderBy: { position: 'desc' },
    });
    return this.prisma.pipelineColumn.create({
      data: {
        userId: user.id,
        name: dto.name.trim(),
        color: dto.color,
        position: (last?.position ?? -1) + 1,
      },
    });
  }

  async updateColumn(user: AuthUser, id: string, dto: UpdatePipelineColumnDto) {
    const column = await this.findUserColumn(user.id, id);
    if (dto.position !== undefined && dto.position !== column.position) {
      await this.reorderColumn(user.id, id, dto.position);
    }
    return this.prisma.pipelineColumn.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        color: dto.color,
      },
    });
  }

  async reorderColumns(user: AuthUser, columnIds: string[]) {
    const columns = await this.prisma.pipelineColumn.findMany({
      where: { userId: user.id },
    });
    if (columnIds.length !== columns.length) {
      throw new BadRequestException('Lista de colunas inválida');
    }
    const validIds = new Set(columns.map((c) => c.id));
    if (!columnIds.every((id) => validIds.has(id))) {
      throw new BadRequestException('Coluna não encontrada');
    }
    await this.prisma.$transaction(
      columnIds.map((id, index) =>
        this.prisma.pipelineColumn.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );
    return this.getColumns(user);
  }

  async deleteColumn(user: AuthUser, id: string) {
    const columns = await this.getColumns(user);
    if (columns.length <= 1) {
      throw new BadRequestException('O funil precisa ter ao menos uma coluna');
    }
    const column = await this.findUserColumn(user.id, id);
    const fallback = columns.find((c) => c.id !== column.id);
    if (!fallback) {
      throw new BadRequestException('Não foi possível excluir a coluna');
    }

    await this.prisma.$transaction([
      this.prisma.opportunityPlacement.updateMany({
        where: { userId: user.id, columnId: column.id },
        data: { columnId: fallback.id },
      }),
      this.prisma.pipelineColumn.delete({ where: { id: column.id } }),
    ]);

    return { message: 'Coluna excluída' };
  }

  async moveCard(user: AuthUser, opportunityId: string, dto: MovePipelineCardDto) {
    await this.findUserColumn(user.id, dto.columnId);
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, ...opportunityScope(user) },
    });
    if (!opportunity) throw new NotFoundException('Oportunidade não encontrada');

    const placement = await this.prisma.opportunityPlacement.upsert({
      where: {
        opportunityId_userId: { opportunityId, userId: user.id },
      },
      create: {
        opportunityId,
        userId: user.id,
        columnId: dto.columnId,
        position: dto.position,
      },
      update: {
        columnId: dto.columnId,
        position: dto.position,
      },
    });

    await this.prisma.opportunity.update({
      where: { id: opportunityId },
      data: { ultimaInteracao: new Date() },
    });

    return placement;
  }

  async getKanban(user: AuthUser) {
    const columns = await this.getColumns(user);
    const opportunities = await this.prisma.opportunity.findMany({
      where: opportunityScope(user),
      include: {
        client: { select: { id: true, nomeFantasia: true } },
        brand: { select: { id: true, nome: true } },
        collection: { select: { id: true, nome: true } },
        representative: { select: { id: true, nome: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    await this.syncPlacements(user.id, columns, opportunities);

    const placements = await this.prisma.opportunityPlacement.findMany({
      where: {
        userId: user.id,
        opportunityId: { in: opportunities.map((o) => o.id) },
      },
    });

    const placementMap = new Map(placements.map((p) => [p.opportunityId, p]));

    return columns.map((column) => ({
      id: column.id,
      name: column.name,
      color: column.color,
      position: column.position,
      cards: opportunities
        .filter((o) => placementMap.get(o.id)?.columnId === column.id)
        .sort(
          (a, b) =>
            (placementMap.get(a.id)?.position ?? 0) - (placementMap.get(b.id)?.position ?? 0),
        )
        .map((o) => ({
          id: o.id,
          clientId: o.clientId,
          clientName: o.client.nomeFantasia,
          brandId: o.brandId,
          brandName: o.brand.nome,
          collectionId: o.collectionId,
          collectionName: o.collection.nome,
          representativeName: o.representative?.nome,
          valorPrevisto: Number(o.orcamento) || Number(o.meta),
          meta: Number(o.meta),
          orcamento: Number(o.orcamento),
          valorVendido: Number(o.valorVendido),
          status: o.status,
          ultimaInteracao: o.ultimaInteracao,
          position: placementMap.get(o.id)?.position ?? 0,
        })),
    }));
  }

  private async ensureDefaultColumns(userId: string) {
    const count = await this.prisma.pipelineColumn.count({ where: { userId } });
    if (count > 0) return;

    await this.prisma.pipelineColumn.createMany({
      data: DEFAULT_COLUMNS.map((name, position) => ({
        userId,
        name,
        position,
      })),
    });
  }

  private async findUserColumn(userId: string, columnId: string) {
    const column = await this.prisma.pipelineColumn.findFirst({
      where: { id: columnId, userId },
    });
    if (!column) throw new NotFoundException('Coluna não encontrada');
    return column;
  }

  private async reorderColumn(userId: string, columnId: string, newPosition: number) {
    const columns = await this.prisma.pipelineColumn.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
    });
    const currentIndex = columns.findIndex((c) => c.id === columnId);
    if (currentIndex === -1) return;

    const [moved] = columns.splice(currentIndex, 1);
    columns.splice(Math.min(newPosition, columns.length), 0, moved);

    await this.prisma.$transaction(
      columns.map((col, index) =>
        this.prisma.pipelineColumn.update({
          where: { id: col.id },
          data: { position: index },
        }),
      ),
    );
  }

  private async syncPlacements(
    userId: string,
    columns: { id: string; position: number }[],
    opportunities: { id: string; pipelineStage: PipelineStage }[],
  ) {
    if (!columns.length || !opportunities.length) return;

    const existing = await this.prisma.opportunityPlacement.findMany({
      where: {
        userId,
        opportunityId: { in: opportunities.map((o) => o.id) },
      },
    });
    const existingIds = new Set(existing.map((p) => p.opportunityId));
    const missing = opportunities.filter((o) => !existingIds.has(o.id));
    if (!missing.length) return;

    const stageToColumn = new Map<string, string>();
    STAGE_ORDER.forEach((stage, index) => {
      if (columns[index]) stageToColumn.set(stage, columns[index].id);
    });

    await this.prisma.opportunityPlacement.createMany({
      data: missing.map((opp, index) => ({
        opportunityId: opp.id,
        userId,
        columnId: stageToColumn.get(opp.pipelineStage) ?? columns[0].id,
        position: index,
      })),
      skipDuplicates: true,
    });
  }

  async placeOpportunities(user: AuthUser, opportunityIds: string[], columnId?: string) {
    if (!opportunityIds.length) return;

    const columns = await this.getColumns(user);
    if (!columns.length) return;

    const targetColumn = columnId
      ? columns.find((c) => c.id === columnId)
      : columns[0];
    if (!targetColumn) {
      throw new BadRequestException('Coluna do funil inválida');
    }

    const existingCount = await this.prisma.opportunityPlacement.count({
      where: { userId: user.id, columnId: targetColumn.id },
    });

    await this.prisma.opportunityPlacement.createMany({
      data: opportunityIds.map((opportunityId, index) => ({
        opportunityId,
        userId: user.id,
        columnId: targetColumn.id,
        position: existingCount + index,
      })),
      skipDuplicates: true,
    });
  }

  async getClientColumnForUser(user: AuthUser, clientId: string) {
    const placement = await this.prisma.opportunityPlacement.findFirst({
      where: {
        userId: user.id,
        opportunity: { clientId },
      },
    });
    return placement?.columnId ?? null;
  }

  async moveClientToColumn(user: AuthUser, clientId: string, columnId: string) {
    await this.findUserColumn(user.id, columnId);
    const opportunities = await this.prisma.opportunity.findMany({
      where: { clientId, ...opportunityScope(user) },
      select: { id: true },
    });
    if (!opportunities.length) return;

    const existingCount = await this.prisma.opportunityPlacement.count({
      where: { userId: user.id, columnId },
    });

    await Promise.all(
      opportunities.map((opp, index) =>
        this.prisma.opportunityPlacement.upsert({
          where: {
            opportunityId_userId: { opportunityId: opp.id, userId: user.id },
          },
          create: {
            opportunityId: opp.id,
            userId: user.id,
            columnId,
            position: existingCount + index,
          },
          update: { columnId, position: existingCount + index },
        }),
      ),
    );
  }
}

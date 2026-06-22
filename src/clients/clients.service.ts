import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, CreateObservationDto, UpdateClientDto } from './dto/client.dto';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { clientScope, brandScope } from '../common/utils/data-scope.util';
import { OpportunitiesService } from '../opportunities/opportunities.service';
import { PipelineService } from '../pipeline/pipeline.service';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private opportunitiesService: OpportunitiesService,
    private pipelineService: PipelineService,
  ) {}

  private scopeFilter(user: AuthUser): Prisma.ClientWhereInput {
    return clientScope(user);
  }

  async findAll(user: AuthUser, search?: string) {
    const where: Prisma.ClientWhereInput = {
      ...this.scopeFilter(user),
      ...(search
        ? {
            OR: [
              { nomeFantasia: { contains: search, mode: 'insensitive' } },
              { razaoSocial: { contains: search, mode: 'insensitive' } },
              { cnpj: { contains: search } },
            ],
          }
        : {}),
    };

    return this.prisma.client.findMany({
      where,
      include: {
        representative: { select: { id: true, nome: true } },
        principalBrand: { select: { id: true, nome: true, nomeFantasia: true, razaoSocial: true } },
        collection: { select: { id: true, nome: true, ano: true, temporada: true } },
        brands: { include: { brand: { select: { id: true, nome: true, nomeFantasia: true, razaoSocial: true } } } },
        _count: { select: { opportunities: true, appointments: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const client = await this.prisma.client.findFirst({
      where: { id, ...this.scopeFilter(user) },
      include: {
        representative: true,
        principalBrand: true,
        collection: true,
        brands: { include: { brand: true } },
        opportunities: {
          include: { brand: true, collection: true, representative: true },
          orderBy: { updatedAt: 'desc' },
        },
        appointments: { orderBy: { data: 'desc' }, take: 10 },
        observations: { orderBy: { createdAt: 'desc' } },
        orders: { include: { brand: true }, orderBy: { dataPedido: 'desc' }, take: 20 },
      },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    const pipelineColumnId = await this.pipelineService.getClientColumnForUser(user, id);
    return { ...client, pipelineColumnId };
  }

  async create(dto: CreateClientDto, user: AuthUser) {
    const { brandIds, pipelineColumnId, ...data } = dto;
    const representativeId =
      user.role === 'REPRESENTANTE_COMERCIAL' && user.representativeId
        ? user.representativeId
        : data.representativeId;

    const mapped = this.mapClientData(data);

    const client = await this.prisma.client.create({
      data: {
        ...(mapped as Prisma.ClientUncheckedCreateInput),
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        cnpj: data.cnpj,
        representativeId,
        potencialEstimado: data.potencialEstimado ?? 0,
        primeiroContato: mapped.primeiroContato ?? new Date(),
        brands: brandIds?.length
          ? { create: brandIds.map((brandId) => ({ brandId })) }
          : undefined,
      },
      include: { brands: { include: { brand: true } } },
    });

    let resolvedBrandIds = brandIds;
    if (!resolvedBrandIds?.length) {
      if (user.role === 'REPRESENTANTE_COMERCIAL' && user.representativeId) {
        const links = await this.prisma.representativeBrand.findMany({
          where: { representativeId: user.representativeId },
        });
        resolvedBrandIds = links.map((l) => l.brandId);
      } else {
        const brands = await this.prisma.brand.findMany({ where: { status: 'ATIVA' } });
        resolvedBrandIds = brands.map((b) => b.id);
      }

      if (resolvedBrandIds.length) {
        await this.prisma.clientBrand.createMany({
          data: resolvedBrandIds.map((brandId) => ({ clientId: client.id, brandId })),
          skipDuplicates: true,
        });
      }
    }

    await this.opportunitiesService.generateForClient(client.id, user, pipelineColumnId);

    return this.findOne(client.id, user);
  }

  async update(id: string, dto: UpdateClientDto, user: AuthUser) {
    await this.ensureAccess(id, user);
    const { brandIds, pipelineColumnId, ...data } = dto;

    if (brandIds) {
      await this.prisma.clientBrand.deleteMany({ where: { clientId: id } });
      if (brandIds.length) {
        await this.prisma.clientBrand.createMany({
          data: brandIds.map((brandId) => ({ clientId: id, brandId })),
        });
      }
    }

    await this.prisma.client.update({
      where: { id },
      data: this.mapClientData(data),
    });

    if (pipelineColumnId) {
      const oppCount = await this.prisma.opportunity.count({ where: { clientId: id } });
      if (oppCount === 0) {
        await this.opportunitiesService.generateForClient(id, user, pipelineColumnId);
      } else {
        await this.pipelineService.moveClientToColumn(user, id, pipelineColumnId);
      }
    }

    return this.findOne(id, user);
  }

  async remove(id: string, user: AuthUser) {
    await this.ensureAccess(id, user);
    return this.prisma.client.delete({ where: { id } });
  }

  async addObservation(id: string, dto: CreateObservationDto, user: AuthUser & { id: string; name: string }) {
    await this.ensureAccess(id, user);
    return this.prisma.clientObservation.create({
      data: {
        clientId: id,
        content: dto.content,
        authorId: user.id,
        authorName: user.name,
      },
    });
  }

  async getCrossSell(id: string, user: AuthUser) {
    const client = await this.prisma.client.findFirst({
      where: { id, ...this.scopeFilter(user) },
      include: { brands: true },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');

    const ownedBrandIds = client.brands.map((b) => b.brandId);
    const missingBrands = await this.prisma.brand.findMany({
      where: { id: { notIn: ownedBrandIds }, status: 'ATIVA', ...brandScope(user) },
    });

    return {
      client: { id: client.id, nomeFantasia: client.nomeFantasia },
      ownedBrands: ownedBrandIds.length,
      suggestions: missingBrands.map((b) => ({
        brandId: b.id,
        brandName: b.nome,
        potencialEstimado: client.potencialEstimado,
      })),
    };
  }

  private async ensureAccess(id: string, user: AuthUser) {
    const client = await this.prisma.client.findFirst({
      where: { id, ...this.scopeFilter(user) },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  private mapClientData(data: Partial<Omit<CreateClientDto, 'brandIds' | 'pipelineColumnId'>>) {
    const {
      primeiroContato,
      ultimaInteracao,
      compraDesde,
      faturamentoCiclo,
      ticketMedio,
      potencialEstimado,
      ...rest
    } = data;

    return {
      ...rest,
      faturamentoCiclo: faturamentoCiclo ?? undefined,
      ticketMedio: ticketMedio ?? undefined,
      potencialEstimado: potencialEstimado ?? undefined,
      primeiroContato: primeiroContato ? new Date(primeiroContato) : undefined,
      ultimaInteracao: ultimaInteracao ? new Date(ultimaInteracao) : undefined,
      compraDesde: compraDesde ? new Date(compraDesde) : undefined,
    };
  }
}

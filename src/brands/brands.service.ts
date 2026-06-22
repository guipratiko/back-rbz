import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { brandScope } from '../common/utils/data-scope.util';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  findAll(user: AuthUser) {
    return this.prisma.brand.findMany({
      where: brandScope(user),
      include: {
        representatives: {
          include: { representative: { select: { id: true, nome: true } } },
        },
        _count: { select: { clients: true, opportunities: true } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, ...brandScope(user) },
      include: {
        representatives: { include: { representative: true } },
        clients: { include: { client: true } },
        collections: { include: { collection: true } },
        opportunities: { take: 20, orderBy: { updatedAt: 'desc' } },
      },
    });
    if (!brand) throw new NotFoundException('Marca não encontrada');
    return brand;
  }

  async create(dto: CreateBrandDto) {
    const { representativeLinks, representativeIds, nomeFantasia, nome, ...data } = dto;
    const resolvedNome = (nomeFantasia || nome || data.razaoSocial)?.trim();
    if (!resolvedNome) {
      throw new BadRequestException('Nome fantasia ou razão social obrigatório');
    }

    const links =
      representativeLinks ??
      representativeIds?.map((representativeId) => ({ representativeId, metaMarca: 0 }));

    return this.prisma.brand.create({
      data: {
        ...data,
        nome: resolvedNome,
        nomeFantasia: nomeFantasia?.trim() || resolvedNome,
        metaAnual: data.metaAnual ?? 0,
        representatives: links?.length
          ? {
              create: links.map((link) => ({
                representativeId: link.representativeId,
                metaMarca: link.metaMarca ?? 0,
              })),
            }
          : undefined,
      },
      include: {
        representatives: { include: { representative: { select: { id: true, nome: true } } } },
      },
    });
  }

  async update(id: string, dto: UpdateBrandDto, user: AuthUser) {
    await this.findOne(id, user);
    const { representativeLinks, representativeIds, nomeFantasia, nome, ...data } = dto;
    const links =
      representativeLinks ??
      (representativeIds !== undefined
        ? representativeIds.map((representativeId) => ({ representativeId, metaMarca: 0 }))
        : undefined);

    const resolvedNome = (nomeFantasia || nome || data.razaoSocial)?.trim();

    if (links !== undefined) {
      await this.prisma.representativeBrand.deleteMany({ where: { brandId: id } });
      if (links.length) {
        await this.prisma.representativeBrand.createMany({
          data: links.map((link) => ({
            brandId: id,
            representativeId: link.representativeId,
            metaMarca: link.metaMarca ?? 0,
          })),
        });
      }
    }

    return this.prisma.brand.update({
      where: { id },
      data: {
        ...data,
        ...(resolvedNome ? { nome: resolvedNome } : {}),
        ...(nomeFantasia !== undefined ? { nomeFantasia: nomeFantasia.trim() || resolvedNome } : {}),
        metaAnual: data.metaAnual,
      },
      include: {
        representatives: { include: { representative: { select: { id: true, nome: true } } } },
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.brand.delete({ where: { id } });
  }
}

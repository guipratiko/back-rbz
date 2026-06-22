import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRepresentativeDto, UpdateRepresentativeDto } from './dto/representative.dto';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { representativeScope } from '../common/utils/data-scope.util';

@Injectable()
export class RepresentativesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
  ) {}

  async findAll(user: AuthUser) {
    await this.authService.syncRepresentativeUsers();
    return this.prisma.representative.findMany({
      where: representativeScope(user),
      include: {
        brands: { include: { brand: { select: { id: true, nome: true, metaAnual: true } } } },
        _count: { select: { clients: true, opportunities: true } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const rep = await this.prisma.representative.findFirst({
      where: { id, ...representativeScope(user) },
      include: {
        brands: { include: { brand: true } },
        clients: true,
        goals: true,
        opportunities: { take: 20, orderBy: { updatedAt: 'desc' } },
      },
    });
    if (!rep) throw new NotFoundException('Representante não encontrado');

    const metaTotal = rep.brands.reduce((sum, b) => sum + Number(b.metaMarca), 0);
    const percentual = metaTotal > 0 ? (Number(rep.faturamento) / metaTotal) * 100 : 0;

    return { ...rep, metaTotal, percentualAtingido: Math.round(percentual * 100) / 100 };
  }

  async create(dto: CreateRepresentativeDto) {
    const { brandIds, ...data } = dto;
    return this.prisma.representative.create({
      data: {
        ...data,
        metaConsolidada: data.metaConsolidada ?? 0,
        brands: brandIds?.length
          ? { create: brandIds.map((brandId) => ({ brandId })) }
          : undefined,
      },
      include: { brands: { include: { brand: true } } },
    });
  }

  async update(id: string, dto: UpdateRepresentativeDto) {
    const { brandIds, ...data } = dto;
    if (brandIds) {
      await this.prisma.representativeBrand.deleteMany({ where: { representativeId: id } });
      if (brandIds.length) {
        await this.prisma.representativeBrand.createMany({
          data: brandIds.map((brandId) => ({ representativeId: id, brandId })),
        });
      }
    }
    return this.prisma.representative.update({
      where: { id },
      data: { ...data, metaConsolidada: data.metaConsolidada },
    });
  }

  remove(id: string) {
    return this.prisma.representative.delete({ where: { id } });
  }
}

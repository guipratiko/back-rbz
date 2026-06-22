import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  private readonly brandSelect = {
    id: true,
    nome: true,
    nomeFantasia: true,
    razaoSocial: true,
  } as const;

  findAll() {
    return this.prisma.collection.findMany({
      include: {
        brands: {
          include: { brand: { select: this.brandSelect } },
        },
        _count: { select: { opportunities: true } },
      },
      orderBy: [{ ano: 'desc' }, { dataInicio: 'desc' }],
    });
  }

  async findOne(id: string) {
    const col = await this.prisma.collection.findUnique({
      where: { id },
      include: { brands: { include: { brand: true } }, opportunities: true },
    });
    if (!col) throw new NotFoundException('Coleção não encontrada');
    return col;
  }

  create(dto: CreateCollectionDto) {
    const { brandLinks, brandIds, ...data } = dto;
    const links =
      brandLinks ?? brandIds?.map((brandId) => ({ brandId, meta: 0 }));

    return this.prisma.collection.create({
      data: {
        ...data,
        dataInicio: new Date(data.dataInicio),
        dataEncerramento: new Date(data.dataEncerramento),
        brands: links?.length
          ? {
              create: links.map((link) => ({
                brandId: link.brandId,
                meta: link.meta ?? 0,
              })),
            }
          : undefined,
      },
      include: {
        brands: { include: { brand: { select: this.brandSelect } } },
      },
    });
  }

  async update(id: string, dto: UpdateCollectionDto) {
    const { brandLinks, brandIds, ...data } = dto;
    const links =
      brandLinks ??
      (brandIds !== undefined ? brandIds.map((brandId) => ({ brandId, meta: 0 })) : undefined);

    if (links !== undefined) {
      await this.prisma.collectionBrand.deleteMany({ where: { collectionId: id } });
      if (links.length) {
        await this.prisma.collectionBrand.createMany({
          data: links.map((link) => ({
            collectionId: id,
            brandId: link.brandId,
            meta: link.meta ?? 0,
          })),
        });
      }
    }

    return this.prisma.collection.update({
      where: { id },
      data: {
        ...data,
        dataInicio: data.dataInicio ? new Date(data.dataInicio) : undefined,
        dataEncerramento: data.dataEncerramento ? new Date(data.dataEncerramento) : undefined,
      },
      include: {
        brands: { include: { brand: { select: this.brandSelect } } },
      },
    });
  }

  remove(id: string) {
    return this.prisma.collection.delete({ where: { id } });
  }
}

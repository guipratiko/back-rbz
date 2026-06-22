import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const [clients, brands, opportunities, orders] = await Promise.all([
      this.prisma.client.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.brand.findMany({ select: { nome: true, metaAnual: true } }),
      this.prisma.opportunity.groupBy({ by: ['pipelineStage'], _count: { id: true } }),
      this.prisma.order.aggregate({ _sum: { valor: true } }),
    ]);

    return {
      clientesPorStatus: clients,
      marcas: brands,
      funilPorEstagio: opportunities,
      faturamentoTotal: Number(orders._sum.valor ?? 0),
      geradoEm: new Date().toISOString(),
    };
  }
}

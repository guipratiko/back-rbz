import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const [orders, goals, clients] = await Promise.all([
      this.prisma.order.aggregate({ _sum: { valor: true }, _count: { id: true } }),
      this.prisma.goal.aggregate({ _sum: { valor: true } }),
      this.prisma.client.aggregate({ _avg: { ticketMedio: true } }),
    ]);

    const faturamento = Number(orders._sum.valor ?? 0);
    const meta = Number(goals._sum.valor ?? 0);

    return {
      faturamento,
      ticketMedio: Number(clients._avg.ticketMedio ?? 0),
      totalPedidos: orders._count.id,
      metaFinanceira: meta,
      percentualMeta: meta > 0 ? Math.round((faturamento / meta) * 10000) / 100 : 0,
    };
  }

  getOrders() {
    return this.prisma.order.findMany({
      include: {
        client: { select: { nomeFantasia: true } },
        brand: { select: { nome: true } },
        collection: { select: { nome: true } },
      },
      orderBy: { dataPedido: 'desc' },
    });
  }
}

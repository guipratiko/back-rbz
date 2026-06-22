import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getExecutive() {
    const [
      totalClients,
      activeBrands,
      activeReps,
      orders,
      goals,
      opportunities,
      newClients,
      lostClients,
    ] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.brand.count({ where: { status: 'ATIVA' } }),
      this.prisma.representative.count(),
      this.prisma.order.aggregate({ _sum: { valor: true } }),
      this.prisma.goal.aggregate({ _sum: { valor: true } }),
      this.prisma.opportunity.findMany({
        select: { meta: true, valorVendido: true, orcamento: true, pipelineStage: true },
      }),
      this.prisma.client.count({
        where: { createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.client.count({ where: { status: 'PERDIDO' } }),
    ]);

    const faturamento = Number(orders._sum.valor ?? 0);
    const metaConsolidada = Number(goals._sum.valor ?? 0);
    const percentualMeta = metaConsolidada > 0 ? (faturamento / metaConsolidada) * 100 : 0;
    const projecaoFunil = opportunities.reduce((sum, o) => sum + Number(o.orcamento || o.meta), 0);

    const activeCount = await this.prisma.client.count({ where: { status: 'ATIVO' } });
    const retencao = totalClients > 0 ? (activeCount / totalClients) * 100 : 0;

    return {
      clientesUnicos: totalClients,
      marcasAtivas: activeBrands,
      representantesAtivos: activeReps,
      faturamentoCiclo: faturamento,
      metaConsolidada,
      projecaoFunil,
      percentualMetaAtingida: Math.round(percentualMeta * 100) / 100,
      retencaoGeral: Math.round(retencao * 100) / 100,
      clientesNovos: newClients,
      clientesPerdidos: lostClients,
    };
  }

  async getCommercial() {
    const [brands, reps, topClients, orders] = await Promise.all([
      this.prisma.brand.findMany({
        include: { goals: true, orders: { select: { valor: true } } },
      }),
      this.prisma.representative.findMany({
        include: { brands: true, clients: true },
      }),
      this.prisma.client.findMany({
        orderBy: { faturamentoCiclo: 'desc' },
        take: 10,
        select: { id: true, nomeFantasia: true, faturamentoCiclo: true, ticketMedio: true },
      }),
      this.prisma.order.groupBy({
        by: ['dataPedido'],
        _sum: { valor: true },
        orderBy: { dataPedido: 'asc' },
      }),
    ]);

    const metasPorMarca = brands.map((b) => ({
      marca: b.nome,
      meta: Number(b.metaAnual),
      vendido: b.orders.reduce((s, o) => s + Number(o.valor), 0),
    }));

    const metasPorRep = reps.map((r) => ({
      representante: r.nome,
      meta: Number(r.metaConsolidada),
      vendido: Number(r.faturamento),
      clientes: r.clients.length,
    }));

    const [ativos, inativos, multimarcas] = await Promise.all([
      this.prisma.client.count({ where: { status: 'ATIVO' } }),
      this.prisma.client.count({ where: { status: 'INATIVO' } }),
      this.prisma.client.findMany({ include: { _count: { select: { brands: true } } } }),
    ]);

    const multimarcasCount = multimarcas.filter((c) => c._count.brands > 1).length;
    const ticketMedioAgg = await this.prisma.client.aggregate({ _avg: { ticketMedio: true } });

    return {
      metasPorMarca,
      metasPorRepresentante: metasPorRep,
      rankingClientes: topClients,
      evolucaoFaturamento: orders.map((o) => ({
        data: o.dataPedido,
        valor: Number(o._sum.valor ?? 0),
      })),
      clientesAtivos: ativos,
      clientesInativos: inativos,
      clientesMultimarcas: multimarcasCount,
      ticketMedio: Number(ticketMedioAgg._avg.ticketMedio ?? 0),
    };
  }

  async getMarketing() {
    const [campaigns, leads, converted] = await Promise.all([
      this.prisma.marketingCampaign.findMany(),
      this.prisma.marketingLead.findMany(),
      this.prisma.marketingLead.count({ where: { convertido: true } }),
    ]);

    const investimento = campaigns.reduce((s, c) => s + Number(c.investimento), 0);
    const leadsGerados = leads.length;
    const receita = campaigns.reduce((s, c) => s + Number(c.receita), 0);
    const cpl = leadsGerados > 0 ? investimento / leadsGerados : 0;
    const cac = converted > 0 ? investimento / converted : 0;
    const roi = investimento > 0 ? ((receita - investimento) / investimento) * 100 : 0;

    const origem = await this.prisma.marketingLead.groupBy({
      by: ['origem'],
      _count: { id: true },
    });

    return {
      investimento,
      leadsGerados,
      cpl: Math.round(cpl * 100) / 100,
      clientesNovos: converted,
      cac: Math.round(cac * 100) / 100,
      receitaAtribuida: receita,
      roi: Math.round(roi * 100) / 100,
      origemLeads: origem.map((o) => ({ origem: o.origem, total: o._count.id })),
    };
  }

  async getGeographic() {
    const clients = await this.prisma.client.findMany({
      select: { estado: true, cidade: true, potencialEstimado: true, faturamentoCiclo: true },
    });

    const byState: Record<string, { count: number; potencial: number; faturamento: number }> = {};
    const byCity: Record<string, { count: number; potencial: number }> = {};

    for (const c of clients) {
      const estado = c.estado || 'N/A';
      const cidade = c.cidade || 'N/A';
      if (!byState[estado]) byState[estado] = { count: 0, potencial: 0, faturamento: 0 };
      byState[estado].count++;
      byState[estado].potencial += Number(c.potencialEstimado);
      byState[estado].faturamento += Number(c.faturamentoCiclo);

      const cityKey = `${cidade}-${estado}`;
      if (!byCity[cityKey]) byCity[cityKey] = { count: 0, potencial: 0 };
      byCity[cityKey].count++;
      byCity[cityKey].potencial += Number(c.potencialEstimado);
    }

    return {
      porEstado: Object.entries(byState).map(([estado, data]) => ({ estado, ...data })),
      porCidade: Object.entries(byCity).map(([key, data]) => {
        const [cidade, estado] = key.split('-');
        return { cidade, estado, ...data };
      }),
    };
  }

  async getCrossSelling() {
    const clients = await this.prisma.client.findMany({
      include: { brands: { include: { brand: true } } },
    });
    const allBrands = await this.prisma.brand.findMany({ where: { status: 'ATIVA' } });

    return clients.map((client) => {
      const ownedIds = new Set(client.brands.map((b) => b.brandId));
      const missing = allBrands.filter((b) => !ownedIds.has(b.id));
      return {
        clientId: client.id,
        clientName: client.nomeFantasia,
        marcasCompradas: client.brands.map((b) => b.brand.nome),
        marcasSugeridas: missing.map((b) => b.nome),
        oportunidades: missing.length,
      };
    }).filter((c) => c.oportunidades > 0);
  }

  async getRetention() {
    const now = Date.now();
    const days90 = new Date(now - 90 * 24 * 60 * 60 * 1000);
    const days120 = new Date(now - 120 * 24 * 60 * 60 * 1000);

    const clients = await this.prisma.client.findMany({
      include: { appointments: { orderBy: { data: 'desc' }, take: 1 } },
    });

    const semVisita = clients.filter(
      (c) => !c.appointments[0] || c.appointments[0].data < days90,
    );
    const semCompra = clients.filter((c) => !c.ultimaCompra || c.ultimaCompra < days120);
    const perdidos = clients.filter((c) => c.status === 'PERDIDO');
    const recorrentes = clients.filter((c) => c.frequenciaCompra >= 3);

    const lostOpps = await this.prisma.opportunity.findMany({
      where: { status: 'PERDIDO' },
      select: { lossReason: true, orcamento: true, meta: true },
    });

    const motivos: Record<string, number> = {};
    let receitaPerdida = 0;
    for (const o of lostOpps) {
      const reason = o.lossReason || 'OUTRO';
      motivos[reason] = (motivos[reason] || 0) + 1;
      receitaPerdida += Number(o.orcamento || o.meta);
    }

    return {
      clientesRecorrentes: recorrentes.length,
      clientesEmRisco: semCompra.filter((c) => c.status === 'ATIVO').length,
      semCompraRecente: semCompra.length,
      semVisitaRecente: semVisita.length,
      clientesPerdidos: perdidos.length,
      motivosPerda: Object.entries(motivos).map(([motivo, total]) => ({ motivo, total })),
      receitaPerdida,
    };
  }

  async getAlerts() {
    const now = Date.now();
    const days90 = new Date(now - 90 * 24 * 60 * 60 * 1000);
    const days120 = new Date(now - 120 * 24 * 60 * 60 * 1000);
    const days30 = new Date(now + 30 * 24 * 60 * 60 * 1000);

    const [semVisita, semCompra, colecoesEncerrando, oportunidadesParadas] = await Promise.all([
      this.prisma.client.findMany({
        where: { status: 'ATIVO' },
        include: { appointments: { orderBy: { data: 'desc' }, take: 1 } },
      }),
      this.prisma.client.findMany({
        where: { status: 'ATIVO', OR: [{ ultimaCompra: { lt: days120 } }, { ultimaCompra: null }] },
        select: { id: true, nomeFantasia: true, ultimaCompra: true, potencialEstimado: true },
      }),
      this.prisma.collection.findMany({
        where: { dataEncerramento: { lte: days30 }, status: 'ATIVA' },
      }),
      this.prisma.opportunity.findMany({
        where: {
          pipelineStage: { notIn: ['FATURADO', 'PERDIDO'] },
          ultimaInteracao: { lt: days90 },
        },
        include: { client: true, brand: true },
        take: 20,
      }),
    ]);

    const visitaAlerts = semVisita
      .filter((c) => !c.appointments[0] || c.appointments[0].data < days90)
      .map((c) => ({
        type: 'SEM_VISITA_90_DIAS',
        clientId: c.id,
        clientName: c.nomeFantasia,
      }));

    return {
      semVisita90Dias: visitaAlerts,
      semCompra120Dias: semCompra.map((c) => ({
        type: 'SEM_COMPRA_120_DIAS',
        clientId: c.id,
        clientName: c.nomeFantasia,
      })),
      colecoesEncerrando: colecoesEncerrando.map((c) => ({
        type: 'COLECAO_ENCERRANDO',
        collectionId: c.id,
        nome: c.nome,
        dataEncerramento: c.dataEncerramento,
      })),
      oportunidadesParadas: oportunidadesParadas.map((o) => ({
        type: 'OPORTUNIDADE_PARADA',
        opportunityId: o.id,
        clientName: o.client.nomeFantasia,
        brandName: o.brand.nome,
      })),
    };
  }
}

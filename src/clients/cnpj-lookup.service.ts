import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

interface BrasilApiCnpjResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  email?: string | null;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  descricao_tipo_de_logradouro?: string;
  cnae_fiscal_descricao?: string;
  descricao_situacao_cadastral?: string;
}

interface ReceitaWsCnpjResponse {
  status?: string;
  message?: string;
  nome?: string;
  fantasia?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  situacao?: string;
  atividade_principal?: Array<{ text?: string }>;
}

export interface CnpjLookupResult {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  endereco?: string;
  cep?: string;
  segmento?: string;
  situacaoCadastral?: string;
}

function shortenRazaoSocial(razao: string) {
  return razao.replace(/\s+(LTDA|ME|EPP|S\.?A\.?|EIRELI).*$/i, '').trim() || razao;
}

function looksLikePersonName(value: string, razaoSocial: string) {
  if (/LTDA|SA|ME|EPP|EIRELI|\d/i.test(value)) return false;
  if (razaoSocial.toUpperCase().includes(value.toUpperCase())) return false;
  const words = value.trim().split(/\s+/);
  return words.length >= 2 && words.length <= 5 && /LTDA|SA|ME|EPP|EIRELI/i.test(razaoSocial);
}

export function resolveNomeFantasia(razaoSocial: string, fantasia?: string | null) {
  const trimmed = fantasia?.trim();
  if (trimmed && trimmed.length > 1 && !looksLikePersonName(trimmed, razaoSocial)) {
    return trimmed;
  }
  return shortenRazaoSocial(razaoSocial);
}

@Injectable()
export class CnpjLookupService {
  private readonly logger = new Logger(CnpjLookupService.name);
  private readonly primaryUrl =
    process.env.CNPJ_API_URL || 'https://brasilapi.com.br/api/cnpj/v1';
  private readonly fallbackUrl =
    process.env.CNPJ_FALLBACK_API_URL || 'https://www.receitaws.com.br/v1/cnpj';

  private readonly fetchHeaders = {
    Accept: 'application/json',
    'User-Agent': 'RBZ-CRM/1.0 (+https://rbz.com.br)',
  };

  async lookup(rawCnpj: string): Promise<CnpjLookupResult> {
    const digits = rawCnpj.replace(/\D/g, '');
    if (digits.length !== 14) {
      throw new BadRequestException('CNPJ deve conter 14 dígitos');
    }

    try {
      return await this.fetchFromBrasilApi(digits);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.warn(`BrasilAPI indisponível para ${digits}, tentando fallback`);
    }

    try {
      return await this.fetchFromReceitaWs(digits);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`Fallback de CNPJ falhou para ${digits}`);
      throw new ServiceUnavailableException(
        'Serviço de consulta de CNPJ temporariamente indisponível. Tente novamente em instantes.',
      );
    }
  }

  private async fetchFromBrasilApi(digits: string): Promise<CnpjLookupResult> {
    const response = await this.safeFetch(`${this.primaryUrl}/${digits}`);

    if (response.status === 404) {
      throw new NotFoundException('CNPJ não encontrado na Receita Federal');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(`BrasilAPI retornou ${response.status}`);
    }

    const data = (await response.json()) as BrasilApiCnpjResponse;
    return this.mapBrasilApi(data);
  }

  private async fetchFromReceitaWs(digits: string): Promise<CnpjLookupResult> {
    const response = await this.safeFetch(`${this.fallbackUrl}/${digits}`);

    if (response.status === 404) {
      throw new NotFoundException('CNPJ não encontrado na Receita Federal');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(`ReceitaWS retornou ${response.status}`);
    }

    const data = (await response.json()) as ReceitaWsCnpjResponse;

    if (data.status === 'ERROR') {
      if (data.message?.toLowerCase().includes('não encontr')) {
        throw new NotFoundException('CNPJ não encontrado na Receita Federal');
      }
      throw new ServiceUnavailableException(data.message || 'Erro na consulta de CNPJ');
    }

    if (!data.nome) {
      throw new NotFoundException('CNPJ não encontrado na Receita Federal');
    }

    return this.mapReceitaWs(data);
  }

  private async safeFetch(url: string): Promise<Response> {
    try {
      return await fetch(url, {
        headers: this.fetchHeaders,
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'erro de rede';
      throw new ServiceUnavailableException(`Falha na consulta externa: ${message}`);
    }
  }

  private mapBrasilApi(data: BrasilApiCnpjResponse): CnpjLookupResult {
    const enderecoParts = [
      data.descricao_tipo_de_logradouro,
      data.logradouro,
      data.numero && data.numero !== 'SN' ? data.numero : undefined,
      data.complemento,
      data.bairro,
    ].filter(Boolean);

    return {
      razaoSocial: data.razao_social,
      nomeFantasia: resolveNomeFantasia(data.razao_social, data.nome_fantasia),
      cnpj: this.formatCnpj(data.cnpj),
      email: data.email?.trim() || undefined,
      telefone: this.formatPhone(data.ddd_telefone_1) || this.formatPhone(data.ddd_telefone_2),
      cidade: data.municipio,
      estado: data.uf,
      endereco: enderecoParts.length ? enderecoParts.join(', ') : undefined,
      cep: data.cep ? this.formatCep(data.cep) : undefined,
      segmento: data.cnae_fiscal_descricao,
      situacaoCadastral: data.descricao_situacao_cadastral,
    };
  }

  private mapReceitaWs(data: ReceitaWsCnpjResponse): CnpjLookupResult {
    const enderecoParts = [
      data.logradouro,
      data.numero && data.numero !== '0' && data.numero !== 'SN' ? data.numero : undefined,
      data.complemento,
      data.bairro,
    ].filter(Boolean);

    return {
      razaoSocial: data.nome!,
      nomeFantasia: resolveNomeFantasia(data.nome!, data.fantasia),
      cnpj: data.cnpj ? this.formatCnpj(data.cnpj) : '',
      email: data.email?.trim() || undefined,
      telefone: data.telefone?.trim() || undefined,
      cidade: data.municipio,
      estado: data.uf,
      endereco: enderecoParts.length ? enderecoParts.join(', ') : undefined,
      cep: data.cep ? this.formatCep(data.cep) : undefined,
      segmento: data.atividade_principal?.[0]?.text,
      situacaoCadastral: data.situacao,
    };
  }

  private formatCnpj(value: string) {
    const d = value.replace(/\D/g, '');
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  private formatCep(value: string) {
    const d = value.replace(/\D/g, '');
    if (d.length !== 8) return value;
    return d.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }

  private formatPhone(value?: string) {
    if (!value) return undefined;
    const d = value.replace(/\D/g, '');
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    return value;
  }
}

export enum SystemModule {
  DASHBOARD_EXECUTIVO = 'DASHBOARD_EXECUTIVO',
  MARCAS = 'MARCAS',
  CLIENTES = 'CLIENTES',
  REPRESENTANTES = 'REPRESENTANTES',
  FUNIL_COMERCIAL = 'FUNIL_COMERCIAL',
  LEADS = 'LEADS',
  MARKETING = 'MARKETING',
  CONTEUDO = 'CONTEUDO',
  CARTEIRA_MAPA = 'CARTEIRA_MAPA',
  RETENCAO = 'RETENCAO',
  PERDAS = 'PERDAS',
  RELATORIOS = 'RELATORIOS',
  CONFIGURACOES = 'CONFIGURACOES',
  FINANCEIRO = 'FINANCEIRO',
  AGENDA = 'AGENDA',
  METAS = 'METAS',
  COLECOES = 'COLECOES',
}

export enum PermissionAction {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  EXPORT = 'EXPORT',
}

export enum UserRole {
  ADMINISTRADOR = 'ADMINISTRADOR',
  GERENTE_COMERCIAL = 'GERENTE_COMERCIAL',
  REPRESENTANTE_COMERCIAL = 'REPRESENTANTE_COMERCIAL',
  MARKETING = 'MARKETING',
  FINANCEIRO = 'FINANCEIRO',
}

export interface ModulePermission {
  module: SystemModule;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

export const DEFAULT_ADMIN_PERMISSIONS: ModulePermission[] = Object.values(
  SystemModule,
).map((module) => ({
  module,
  view: true,
  create: true,
  edit: true,
  delete: true,
  export: true,
}));

export const ROLE_DEFAULT_MODULES: Record<UserRole, SystemModule[]> = {
  [UserRole.ADMINISTRADOR]: Object.values(SystemModule),
  [UserRole.GERENTE_COMERCIAL]: [
    SystemModule.DASHBOARD_EXECUTIVO,
    SystemModule.MARCAS,
    SystemModule.CLIENTES,
    SystemModule.REPRESENTANTES,
    SystemModule.FUNIL_COMERCIAL,
    SystemModule.AGENDA,
    SystemModule.METAS,
    SystemModule.COLECOES,
    SystemModule.RELATORIOS,
    SystemModule.CARTEIRA_MAPA,
    SystemModule.RETENCAO,
    SystemModule.PERDAS,
  ],
  [UserRole.REPRESENTANTE_COMERCIAL]: [
    SystemModule.CLIENTES,
    SystemModule.MARCAS,
    SystemModule.FUNIL_COMERCIAL,
    SystemModule.AGENDA,
    SystemModule.METAS,
    SystemModule.COLECOES,
    SystemModule.CONFIGURACOES,
  ],
  [UserRole.MARKETING]: [
    SystemModule.LEADS,
    SystemModule.MARKETING,
    SystemModule.CONTEUDO,
    SystemModule.RELATORIOS,
  ],
  [UserRole.FINANCEIRO]: [
    SystemModule.FINANCEIRO,
    SystemModule.RELATORIOS,
  ],
};

export function buildDefaultPermissions(role: UserRole): ModulePermission[] {
  const modules = ROLE_DEFAULT_MODULES[role];
  return Object.values(SystemModule).map((module) => ({
    module,
    view: modules.includes(module),
    create: role === UserRole.ADMINISTRADOR || modules.includes(module),
    edit: role === UserRole.ADMINISTRADOR || modules.includes(module),
    delete: role === UserRole.ADMINISTRADOR,
    export: modules.includes(module),
  }));
}

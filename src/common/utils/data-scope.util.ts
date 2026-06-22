import { Prisma } from '@prisma/client';
import { AuthUser } from '../interfaces/auth-user.interface';

const IMPOSSIBLE_ID = '00000000-0000-0000-0000-000000000000';

export function isRepresentative(user: AuthUser): boolean {
  return user.role === 'REPRESENTANTE_COMERCIAL';
}

export function opportunityScope(user: AuthUser): Prisma.OpportunityWhereInput {
  if (!isRepresentative(user)) return {};
  if (!user.representativeId) return { representativeId: IMPOSSIBLE_ID };
  return { representativeId: user.representativeId };
}

export function clientScope(user: AuthUser): Prisma.ClientWhereInput {
  if (!isRepresentative(user)) return {};
  if (!user.representativeId) return { id: IMPOSSIBLE_ID };
  return { representativeId: user.representativeId };
}

export function appointmentScope(user: AuthUser): Prisma.AppointmentWhereInput {
  if (!isRepresentative(user)) return {};
  if (!user.representativeId) return { representativeId: IMPOSSIBLE_ID };
  return { representativeId: user.representativeId };
}

export function brandScope(user: AuthUser): Prisma.BrandWhereInput {
  if (!isRepresentative(user)) return {};
  if (!user.representativeId) {
    return { id: IMPOSSIBLE_ID };
  }
  return {
    representatives: { some: { representativeId: user.representativeId } },
  };
}

export function representativeScope(user: AuthUser): Prisma.RepresentativeWhereInput {
  if (!isRepresentative(user)) return {};
  if (!user.representativeId) return { id: IMPOSSIBLE_ID };
  return { id: user.representativeId };
}

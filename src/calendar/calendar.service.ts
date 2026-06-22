import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { appointmentScope } from '../common/utils/data-scope.util';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  private scope(user: AuthUser): Prisma.AppointmentWhereInput {
    return appointmentScope(user);
  }

  findAll(user: AuthUser) {
    return this.prisma.appointment.findMany({
      where: this.scope(user),
      include: {
        client: { select: { id: true, nomeFantasia: true } },
        representative: { select: { id: true, nome: true } },
      },
      orderBy: { data: 'asc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const apt = await this.prisma.appointment.findFirst({
      where: { id, ...this.scope(user) },
      include: { client: true, representative: true },
    });
    if (!apt) throw new NotFoundException('Agendamento não encontrado');
    return apt;
  }

  create(dto: CreateAppointmentDto) {
    return this.prisma.appointment.create({
      data: { ...dto, data: new Date(dto.data) },
      include: { client: true, representative: true },
    });
  }

  async update(id: string, dto: UpdateAppointmentDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.appointment.update({
      where: { id },
      data: { ...dto, data: dto.data ? new Date(dto.data) : undefined },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.appointment.delete({ where: { id } });
  }
}

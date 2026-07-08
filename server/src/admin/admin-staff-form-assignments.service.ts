import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateStaffFormAssignmentDto } from './staff-form-assignment-dto';

@Injectable()
export class AdminStaffFormAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** All assignments enriched with form + staff names (FK-less, joined here). */
  async list() {
    const assignments = await this.prisma.staffFormAssignment.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
    const formIds = [...new Set(assignments.map((a) => a.kycFormId))];
    const staffIds = [...new Set(assignments.map((a) => a.staffId))];
    const [forms, staff] = await Promise.all([
      this.prisma.kycForm.findMany({ where: { id: { in: formIds } }, select: { id: true, name: true } }),
      this.prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, firstName: true, lastName: true, role: true } }),
    ]);
    const formById = new Map(forms.map((f) => [f.id, f]));
    const staffById = new Map(staff.map((s) => [s.id, s]));
    return assignments.map((a) => {
      const s = staffById.get(a.staffId);
      return {
        id: a.id,
        kycFormId: a.kycFormId,
        formName: formById.get(a.kycFormId)?.name ?? '(deleted form)',
        staffId: a.staffId,
        staffName: s ? `${s.firstName} ${s.lastName}` : '(deleted staff)',
        staffRole: s?.role ?? null,
        createdAt: a.createdAt,
      };
    });
  }

  async create(adminId: string, dto: CreateStaffFormAssignmentDto) {
    const [form, staff] = await Promise.all([
      this.prisma.kycForm.findUnique({ where: { id: dto.kycFormId } }),
      this.prisma.user.findUnique({ where: { id: dto.staffId } }),
    ]);
    if (!form) throw new NotFoundException('KYC form not found');
    if (!staff || (staff.role !== UserRole.ADMIN && staff.role !== UserRole.AGENT)) {
      throw new BadRequestException('Assignee must be a staff member.');
    }
    try {
      const assignment = await this.prisma.staffFormAssignment.create({ data: { kycFormId: dto.kycFormId, staffId: dto.staffId } });
      await this.audit.record({ userId: adminId, action: 'kyc.form.assign', entity: 'StaffFormAssignment', entityId: assignment.id, metadata: { kycFormId: dto.kycFormId, staffId: dto.staffId } });
      return assignment;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('That form is already assigned to this staff member.');
      }
      throw e;
    }
  }

  async remove(adminId: string, id: string) {
    const existing = await this.prisma.staffFormAssignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.prisma.staffFormAssignment.delete({ where: { id } });
    await this.audit.record({ userId: adminId, action: 'kyc.form.unassign', entity: 'StaffFormAssignment', entityId: id });
    return { ok: true };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoSave, CodeState } from '../entities/auto-save.entity';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class AutosaveService {
  constructor(
    @InjectRepository(AutoSave)
    private readonly autoSaveRepo: Repository<AutoSave>,
  ) {}

  async save(
    userId: number,
    examId: number,
    codeState: CodeState,
  ): Promise<{ saved: true }> {
    await this.autoSaveRepo.upsert(
      { userId, examId, codeState },
      {
        conflictPaths: ['userId', 'examId'],
        skipUpdateIfNoValuesChanged: true,
      },
    );
    return { saved: true };
  }

  async load(userId: number, examId: number): Promise<AutoSave | null> {
    return this.autoSaveRepo.findOne({ where: { userId, examId } });
  }

  async findAll(
    examId?: number,
    pagination?: PaginationDto,
  ): Promise<PaginatedResponse<AutoSave>> {
    const where: Record<string, unknown> = {};
    if (examId) where.examId = examId;
    const page = pagination?.page ?? 1;
    const limit = Math.min(pagination?.limit ?? 10, 100);
    const [data, total] = await this.autoSaveRepo.findAndCount({
      where,
      relations: ['user', 'exam'],
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findOne(id: number) {
    const record = await this.autoSaveRepo.findOne({
      where: { id },
      relations: ['user', 'exam'],
    });
    if (!record) throw new NotFoundException('AutoSave record not found');
    return record;
  }

  async deleteById(id: number): Promise<{ deleted: true }> {
    const record = await this.autoSaveRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('AutoSave record not found');
    await this.autoSaveRepo.remove(record);
    return { deleted: true };
  }
}

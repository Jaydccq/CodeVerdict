import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ProblemsService } from './problems.service';
import { ProblemViewService } from './problem-view.service';
import { Auth } from '../common/decorators/auth.decorator';
import { AuthType } from '../common/enums/auth-type.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ExamWindowGuard } from '../exams/guards/exam-window.guard';
import { User } from '../entities/user.entity';
import { Exam } from '../entities/exam.entity';

interface RequestWithExam extends Request {
  exam?: Exam;
}

@ApiTags('Problems')
@ApiBearerAuth()
@Controller('exams/:examId/problems')
export class ProblemsController {
  constructor(
    private readonly problemsService: ProblemsService,
    private readonly problemViewService: ProblemViewService,
  ) {}

  @Get()
  @Auth(AuthType.JWT, [ExamWindowGuard])
  @ApiParam({ name: 'examId', type: Number, description: 'Exam ID' })
  @ApiOperation({
    summary: 'List all problems for an exam',
    description:
      'Returns all problems belonging to the specified exam. Only accessible during the exam window. Problems are ordered by displayOrder.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of problems',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          title: { type: 'string', example: 'Two Sum' },
          difficulty: {
            type: 'string',
            enum: ['easy', 'medium', 'hard'],
            example: 'medium',
          },
          displayOrder: { type: 'number', example: 1 },
          maxScore: { type: 'number', example: 10 },
          starterCode: {
            type: 'object',
            nullable: true,
            example: { '71': '# your code here\n' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Exam window is not active or not enrolled',
  })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async list(@Req() req: RequestWithExam) {
    const exam = req.exam as Exam;
    return this.problemsService.listByExam(exam.id);
  }

  @Get(':id')
  @Auth(AuthType.JWT, [ExamWindowGuard])
  @ApiParam({ name: 'examId', type: Number, description: 'Exam ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Problem ID' })
  @ApiOperation({
    summary: 'Get a specific problem',
    description:
      'Returns full details of a single problem including visible test cases. The problem must belong to the specified exam. Also tracks that the student viewed this problem.',
  })
  @ApiResponse({
    status: 200,
    description: 'Problem details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
        inputFormat: { type: 'string', nullable: true },
        outputFormat: { type: 'string', nullable: true },
        constraints: { type: 'string', nullable: true },
        sampleInput: { type: 'string', nullable: true },
        sampleOutput: { type: 'string', nullable: true },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        displayOrder: { type: 'number' },
        timeLimitMs: { type: 'number' },
        memoryLimitKb: { type: 'number' },
        maxScore: { type: 'number' },
        starterCode: { type: 'object', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Exam window is not active or not enrolled',
  })
  @ApiResponse({
    status: 404,
    description: 'Problem not found or does not belong to this exam',
  })
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Req() req: RequestWithExam,
  ) {
    const exam = req.exam as Exam;
    this.problemViewService.trackView(user.id, id, exam.id);
    return this.problemsService.getById(id, exam.id);
  }
}

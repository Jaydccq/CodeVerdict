import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { SubmissionsService } from './submissions.service';
import { SubmitDto } from './dto/submit.dto';
import { RunDto } from './dto/run.dto';
import { ProblemsService } from '../problems/problems.service';
import { Auth } from '../common/decorators/auth.decorator';
import { AuthType } from '../common/enums/auth-type.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ExamWindowGuard } from '../exams/guards/exam-window.guard';
import { User } from '../entities/user.entity';
import { Exam } from '../entities/exam.entity';

interface RequestWithExam extends Request {
  exam?: Exam;
}

const submissionResponseSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'number' as const, example: 42 },
    userId: { type: 'number' as const },
    problemId: { type: 'number' as const },
    examId: { type: 'number' as const },
    language: { type: 'string' as const, example: 'Python' },
    languageId: { type: 'number' as const, example: 71 },
    verdict: {
      type: 'string' as const,
      example: 'accepted',
      enum: [
        'accepted',
        'wrong_answer',
        'partial',
        'time_limit',
        'runtime_error',
        'compile_error',
        'pending',
      ],
    },
    score: { type: 'number' as const, example: 10 },
    totalTestCases: { type: 'number' as const, example: 5 },
    passedTestCases: { type: 'number' as const, example: 5 },
    testResults: {
      type: 'array' as const,
      nullable: true,
      items: {
        type: 'object' as const,
        properties: {
          index: { type: 'number' as const },
          passed: { type: 'boolean' as const },
          status: { type: 'string' as const, example: 'Accepted' },
          statusId: { type: 'number' as const },
          time: { type: 'number' as const, nullable: true, example: 0.012 },
          memory: { type: 'number' as const, nullable: true, example: 9200 },
        },
      },
    },
    submittedAt: { type: 'string' as const, format: 'date-time' },
  },
};

@ApiTags('Submissions')
@ApiBearerAuth()
@Controller('exams/:examId/problems/:problemId')
export class SubmissionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly problemsService: ProblemsService,
  ) {}

  @Post('submissions')
  @Auth(AuthType.JWT, [ExamWindowGuard])
  @ApiOperation({
    summary: 'Submit code for grading',
    description:
      'Submits source code for a problem. The code is judged against all test cases and a verdict is returned. Rate limited to 10 submissions per 5 minutes. Only accessible during the exam window. The best score per problem is tracked.',
  })
  @ApiParam({ name: 'examId', type: Number })
  @ApiParam({ name: 'problemId', type: Number })
  @ApiBody({ type: SubmitDto })
  @ApiResponse({
    status: 201,
    description: 'Submission judged',
    schema: submissionResponseSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or problem already solved',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Exam window is not active' })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded - max 10 submissions per 5 minutes',
  })
  async submit(
    @Param('problemId', ParseIntPipe) problemId: number,
    @Body() dto: SubmitDto,
    @GetUser() user: User,
    @Req() req: RequestWithExam,
  ) {
    const exam = req.exam as Exam;
    const problem =
      await this.problemsService.getByIdWithAllTestCases(problemId);

    if (problem.questionType === 'mcq') {
      throw new BadRequestException(
        'MCQ problems must be submitted via POST /exams/:examId/mcq-section/submit',
      );
    }

    return this.submissionsService.submit(
      user.id,
      problemId,
      dto.sourceCode,
      dto.languageId,
      exam,
    );
  }

  @Post('run')
  @Auth(AuthType.JWT, [ExamWindowGuard])
  @ApiOperation({
    summary: 'Run code without grading',
    description:
      'Runs source code against sample test cases. Optionally provide customInput to also run against a custom input. Does not affect scores. Rate limited to 30 runs per 5 minutes.',
  })
  @ApiParam({ name: 'examId', type: Number })
  @ApiParam({ name: 'problemId', type: Number })
  @ApiBody({ type: RunDto })
  @ApiResponse({
    status: 201,
    description: 'Run results',
    schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              index: { type: 'number' },
              passed: { type: 'boolean' },
              status: { type: 'string' },
              stdout: { type: 'string', nullable: true },
              stderr: { type: 'string', nullable: true },
              compileOutput: { type: 'string', nullable: true },
              time: { type: 'number', nullable: true },
              memory: { type: 'number', nullable: true },
            },
          },
        },
        customResult: {
          type: 'object',
          nullable: true,
          properties: {
            stdout: { type: 'string', nullable: true },
            stderr: { type: 'string', nullable: true },
            compileOutput: { type: 'string', nullable: true },
            status: { type: 'string' },
            time: { type: 'number', nullable: true },
            memory: { type: 'number', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Exam window is not active' })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded - max 30 runs per 5 minutes',
  })
  async run(
    @Param('problemId', ParseIntPipe) problemId: number,
    @Body() dto: RunDto,
    @GetUser() user: User,
    @Req() req: RequestWithExam,
  ) {
    const exam = req.exam as Exam;
    const problem =
      await this.problemsService.getByIdWithAllTestCases(problemId);
    if (problem.questionType === 'mcq') {
      throw new BadRequestException('Run is not available for MCQ problems');
    }
    return this.submissionsService.run(
      user.id,
      problemId,
      dto.sourceCode,
      dto.languageId,
      exam,
      dto.customInput,
    );
  }

  @Get('submissions')
  @Auth()
  @ApiOperation({
    summary: 'List your submissions for a problem',
    description:
      'Returns all submissions made by the authenticated user for this problem in this exam.',
  })
  @ApiParam({ name: 'examId', type: Number })
  @ApiParam({ name: 'problemId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Array of submissions',
    schema: { type: 'array', items: submissionResponseSchema },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('problemId', ParseIntPipe) problemId: number,
    @GetUser() user: User,
  ) {
    return this.submissionsService.listByUser(user.id, examId, problemId);
  }

  @Get('submissions/:submissionId')
  @Auth()
  @ApiOperation({
    summary: 'Get a specific submission',
    description:
      'Returns full details of a submission including all test results. You can only view your own submissions.',
  })
  @ApiParam({ name: 'examId', type: Number })
  @ApiParam({ name: 'problemId', type: Number })
  @ApiParam({
    name: 'submissionId',
    type: Number,
    description: 'Submission ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Submission details',
    schema: submissionResponseSchema,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Submission not found or does not belong to you',
  })
  async getById(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @GetUser() user: User,
  ) {
    return this.submissionsService.getById(submissionId, user.id);
  }
}

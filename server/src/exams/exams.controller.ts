import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { Auth } from '../common/decorators/auth.decorator';
import { AuthType } from '../common/enums/auth-type.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Exams')
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get('upcoming')
  @Auth(AuthType.NONE)
  @ApiOperation({
    summary: 'Get all upcoming or currently active exams',
    description:
      'Returns all active exams that have not ended yet, with server time for clock drift correction. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active exams with server time metadata',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              title: { type: 'string', example: 'Mid-Semester Coding Exam' },
              startTime: {
                type: 'string',
                format: 'date-time',
                example: '2026-03-13T09:00:00.000Z',
              },
              endTime: {
                type: 'string',
                format: 'date-time',
                example: '2026-03-13T12:00:00.000Z',
              },
              durationMinutes: { type: 'number', example: 180 },
              allowedLanguages: {
                type: 'array',
                items: { type: 'number' },
                example: [71, 54, 62],
              },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            serverTime: {
              type: 'string',
              format: 'date-time',
              description:
                'Current server time for client-side clock drift correction',
            },
          },
        },
      },
    },
  })
  async getActive() {
    const exams = await this.examsService.getUpcomingExams();

    return {
      data: exams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        startTime: exam.startTime,
        endTime: exam.endTime,
        durationMinutes: exam.durationMinutes,
        allowedLanguages: exam.allowedLanguages,
      })),
      metadata: {
        serverTime: new Date().toISOString(),
      },
    };
  }

  @Get(':id/status')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get exam status and server time',
    description:
      'Returns the exam status including its end time and the authoritative server time. Used for client-side timer synchronization.',
  })
  @ApiResponse({
    status: 200,
    description: 'Exam status',
    schema: {
      type: 'object',
      properties: {
        examId: { type: 'number', example: 1 },
        examEndTime: { type: 'string', format: 'date-time' },
        serverTime: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async getStatus(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.getStatus(id);
  }

  @Get(':examId/my-progress')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student progress for a specific exam' })
  @ApiResponse({
    status: 200,
    description: 'Progress summary',
    schema: {
      type: 'object',
      properties: {
        examId: { type: 'number' },
        totalProblems: { type: 'number' },
        solvedProblems: { type: 'number' },
        allSolved: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async getMyProgress(
    @GetUser() user: User,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return this.examsService.getMyProgress(user.id, examId);
  }
}

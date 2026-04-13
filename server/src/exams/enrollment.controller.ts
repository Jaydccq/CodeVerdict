import { Controller, Get, Post, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { Auth } from '../common/decorators/auth.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Enrollment')
@ApiBearerAuth()
@Controller('exams')
export class EnrollmentController {
  constructor(private readonly examsService: ExamsService) {}

  @Post(':id/enroll')
  @Auth()
  @ApiOperation({
    summary: 'Enroll in an exam',
    description:
      'Enroll the authenticated student in the specified exam. The exam must be active and not yet ended.',
  })
  @ApiResponse({
    status: 201,
    description: 'Enrollment created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        userId: { type: 'number' },
        examId: { type: 'number' },
        enrolledAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Exam has already ended' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Exam is not open for enrollment' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiResponse({ status: 409, description: 'Already enrolled in this exam' })
  async enroll(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) examId: number,
  ) {
    return this.examsService.enroll(user.id, examId);
  }

  @Get('my-enrollments')
  @Auth()
  @ApiOperation({
    summary: 'List exams the current student is enrolled in',
    description:
      'Returns all exam enrollments for the authenticated student, including exam details.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of enrollments with exam details',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          examId: { type: 'number' },
          enrolledAt: { type: 'string', format: 'date-time' },
          exam: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
              startTime: { type: 'string', format: 'date-time' },
              endTime: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyEnrollments(@GetUser() user: User) {
    return this.examsService.getMyEnrollments(user.id);
  }
}

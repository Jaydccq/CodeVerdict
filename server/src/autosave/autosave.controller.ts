import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiExcludeController,
} from '@nestjs/swagger';
import { AutosaveService } from './autosave.service';
import { Auth } from '../common/decorators/auth.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../entities/user.entity';
import { SaveAutosaveDto } from './dto/save-autosave.dto';

@ApiExcludeController()
@ApiTags('Autosave')
@ApiBearerAuth()
@Controller('autosave')
@Auth()
export class AutosaveController {
  constructor(private readonly autosaveService: AutosaveService) {}

  @Post(':examId')
  @ApiOperation({
    summary: 'Save code state',
    description:
      "Persists the student's current code for all problems and languages. Overwrites any previous save for the same user + exam. Called automatically by the frontend every 30 seconds.",
  })
  @ApiParam({ name: 'examId', type: Number, description: 'Exam ID' })
  @ApiBody({ type: SaveAutosaveDto })
  @ApiResponse({
    status: 201,
    description: 'Code state saved',
    schema: {
      type: 'object',
      properties: { saved: { type: 'boolean', example: true } },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async save(
    @GetUser() user: User,
    @Param('examId', ParseIntPipe) examId: number,
    @Body() dto: SaveAutosaveDto,
  ) {
    return this.autosaveService.save(user.id, examId, dto.codeState);
  }

  @Get(':examId')
  @ApiOperation({
    summary: 'Load saved code state',
    description:
      'Retrieves the previously saved code state for a specific exam. Returns null if no save exists.',
  })
  @ApiParam({ name: 'examId', type: Number, description: 'Exam ID' })
  @ApiResponse({
    status: 200,
    description: 'Saved code state (or null if none exists)',
    schema: {
      nullable: true,
      type: 'object',
      properties: {
        id: { type: 'number' },
        userId: { type: 'number' },
        examId: { type: 'number' },
        codeState: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async load(
    @GetUser() user: User,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return this.autosaveService.load(user.id, examId);
  }
}

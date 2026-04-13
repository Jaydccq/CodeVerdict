import { Controller, Patch, Body, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Auth } from '../common/decorators/auth.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('User')
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('qa-opt-in')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Opt in/out of the QA role track',
    description:
      "Indicate upfront whether you'd like to be considered for QA Engineering if you're not selected for the developer role. Set qaRoleOptIn to true to opt in, or false to withdraw. Can be updated any time before the exam ends.",
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { qaRoleOptIn: { type: 'boolean', example: true } },
      required: ['qaRoleOptIn'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'QA role opt-in preference updated',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  async qaOptIn(
    @GetUser() user: User,
    @Body('qaRoleOptIn') qaRoleOptIn: boolean,
  ): Promise<{ metadata: User['metadata'] }> {
    if (typeof qaRoleOptIn !== 'boolean') {
      throw new BadRequestException('qaRoleOptIn must be a boolean');
    }
    const updated = await this.usersService.updateMetadata(user.id, {
      qaRoleOptIn,
    });
    return { metadata: updated.metadata };
  }
}

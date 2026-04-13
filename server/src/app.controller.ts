import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import { Auth } from './common/decorators/auth.decorator';
import { HealthResponseDto } from './dto/health-response.dto';
import { LanguageResponseDto } from './dto/language-response.dto';

@ApiTags('General')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiExcludeEndpoint()
  getHealth(): HealthResponseDto {
    return this.appService.getHealth();
  }

  @Get('languages')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get supported programming languages',
    description:
      'Returns the list of programming languages available for code submission. Each entry includes the Judge0 language ID, name, and compiler/runtime version.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of supported languages',
    type: [LanguageResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  getLanguages(): LanguageResponseDto[] {
    return this.appService.getLanguages();
  }
}

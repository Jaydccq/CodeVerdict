import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RunCustomDto } from './dto/run-custom.dto';
import { RunSampleDto } from './dto/run-sample.dto';
import { SubmitPracticeDto } from './dto/submit-practice.dto';
import { PracticeService } from './practice.service';

@ApiTags('Practice')
@Controller('problems')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Get()
  @ApiOperation({ summary: 'List available practice problems' })
  listProblems() {
    return this.practiceService.listProblems();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Load one practice problem' })
  getProblem(@Param('slug') slug: string) {
    return this.practiceService.getProblem(slug);
  }

  @Post(':slug/run-sample')
  @ApiOperation({ summary: 'Run code against visible tests only' })
  runSample(@Param('slug') slug: string, @Body() dto: RunSampleDto) {
    return this.practiceService.runSample(slug, dto.sourceCode, dto.language);
  }

  @Post(':slug/run-custom')
  @ApiOperation({ summary: 'Run code with custom stdin only' })
  runCustom(@Param('slug') slug: string, @Body() dto: RunCustomDto) {
    return this.practiceService.runCustom(
      slug,
      dto.sourceCode,
      dto.language,
      dto.customInput,
    );
  }

  @Post(':slug/submit')
  @ApiOperation({ summary: 'Submit code against visible and hidden tests' })
  submit(@Param('slug') slug: string, @Body() dto: SubmitPracticeDto) {
    return this.practiceService.submit(slug, dto.sourceCode, dto.language);
  }

  @Get(':slug/submissions')
  @ApiOperation({ summary: 'List practice submissions for a problem' })
  listSubmissions(@Param('slug') slug: string) {
    return this.practiceService.listSubmissions(slug);
  }
}

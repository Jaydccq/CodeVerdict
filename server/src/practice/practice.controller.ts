import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RunDebugWorkspaceDto } from './dto/run-debug-workspace.dto';
import { RunCustomDto } from './dto/run-custom.dto';
import { RunSampleDto } from './dto/run-sample.dto';
import { SubmitPracticeDto } from './dto/submit-practice.dto';
import { UpdateDebugWorkspaceDraftDto } from './dto/update-debug-workspace-draft.dto';
import { UpdateEditorialDto } from './dto/update-editorial.dto';
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

  @Put(':slug/editorial')
  @ApiOperation({ summary: 'Persist the practice editorial for a problem' })
  saveEditorial(
    @Param('slug') slug: string,
    @Body() dto: UpdateEditorialDto,
  ) {
    return this.practiceService.saveEditorial(slug, dto.editorial);
  }

  @Get(':slug/debug-draft')
  @ApiOperation({ summary: 'Load the persisted draft for a debug-workspace problem' })
  getDebugWorkspaceDraft(@Param('slug') slug: string) {
    return this.practiceService.getDebugWorkspaceDraft(slug);
  }

  @Put(':slug/debug-draft')
  @ApiOperation({ summary: 'Persist the draft for a debug-workspace problem' })
  saveDebugWorkspaceDraft(
    @Param('slug') slug: string,
    @Body() dto: UpdateDebugWorkspaceDraftDto,
  ) {
    return this.practiceService.saveDebugWorkspaceDraft(slug, dto.editedFiles);
  }

  @Post(':slug/run-sample')
  @ApiOperation({ summary: 'Run code against visible tests only' })
  runSample(@Param('slug') slug: string, @Body() dto: RunSampleDto) {
    return this.practiceService.runSample(slug, dto.sourceCode, dto.language);
  }

  @Post(':slug/debug-run')
  @ApiOperation({ summary: 'Run visible tests for a debug-workspace problem' })
  runDebugWorkspace(
    @Param('slug') slug: string,
    @Body() dto: RunDebugWorkspaceDto,
  ) {
    return this.practiceService.runDebugWorkspace(slug, dto.editedFiles);
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

  @Post(':slug/debug-submit')
  @ApiOperation({ summary: 'Submit a debug-workspace problem' })
  submitDebugWorkspace(
    @Param('slug') slug: string,
    @Body() dto: RunDebugWorkspaceDto,
  ) {
    return this.practiceService.submitDebugWorkspace(slug, dto.editedFiles);
  }

  @Get(':slug/submissions')
  @ApiOperation({ summary: 'List practice submissions for a problem' })
  listSubmissions(@Param('slug') slug: string) {
    return this.practiceService.listSubmissions(slug);
  }
}

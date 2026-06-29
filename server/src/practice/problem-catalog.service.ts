import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  hasUnresolvedPlaceholder,
  loadPracticeCatalog,
  toProblemListItem,
} from './problem-catalog';
import type { PracticeProblem } from './problem-types';

@Injectable()
export class ProblemCatalogService implements OnModuleInit {
  private problems = new Map<string, PracticeProblem>();
  private problemsDir = '';

  onModuleInit(): void {
    this.reload();
  }

  private reload(): void {
    const catalog = loadPracticeCatalog();
    this.problemsDir = catalog.problemsDir;
    this.problems = new Map(
      catalog.problems.map((problem) => [problem.slug, problem]),
    );
  }

  list() {
    return Array.from(this.problems.values(), (problem) =>
      toProblemListItem(problem),
    );
  }

  get(slug: string): PracticeProblem {
    const problem = this.problems.get(slug);
    if (!problem) {
      throw new NotFoundException(`Problem not found: ${slug}`);
    }
    return problem;
  }

  async saveEditorial(slug: string, editorial: string): Promise<PracticeProblem> {
    const problem = this.get(slug);
    const normalized = editorial.replace(/\r\n/g, '\n').trimEnd();

    if (problem.source === 'amazon-oa') {
      if (normalized.trim() === '') {
        throw new BadRequestException(
          'Amazon OA problems require a non-empty editorial.',
        );
      }
      if (hasUnresolvedPlaceholder(normalized)) {
        throw new BadRequestException(
          'Editorial contains unresolved source placeholders.',
        );
      }
    }

    const editorialPath = path.join(this.problemsDir, problem.slug, 'editorial.md');
    const persisted = normalized.length > 0 ? `${normalized}\n` : '';
    await writeFile(editorialPath, persisted, 'utf8');
    this.reload();
    return this.get(slug);
  }
}

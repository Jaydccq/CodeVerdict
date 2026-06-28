import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { loadPracticeCatalog, toProblemListItem } from './problem-catalog';
import type { PracticeProblem } from './problem-types';

@Injectable()
export class ProblemCatalogService implements OnModuleInit {
  private problems = new Map<string, PracticeProblem>();

  onModuleInit(): void {
    const catalog = loadPracticeCatalog();
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
}

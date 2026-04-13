import { Injectable } from '@nestjs/common';
import { HealthResponseDto } from './dto/health-response.dto';
import { LanguageResponseDto } from './dto/language-response.dto';

const SUPPORTED_LANGUAGES: LanguageResponseDto[] = [
  // Python
  { id: 113, name: 'Python (3.14.0)', version: '3.14.0' },
  { id: 109, name: 'Python (3.13.2)', version: '3.13.2' },
  { id: 71, name: 'Python (3.8.1)', version: '3.8.1' },
  { id: 70, name: 'Python (2.7.17)', version: '2.7.17' },
  // C++
  { id: 105, name: 'C++ (GCC 14.1.0)', version: 'GCC 14.1.0' },
  { id: 54, name: 'C++ (GCC 9.2.0)', version: 'GCC 9.2.0' },
  { id: 53, name: 'C++ (GCC 8.3.0)', version: 'GCC 8.3.0' },
  { id: 52, name: 'C++ (GCC 7.4.0)', version: 'GCC 7.4.0' },
  { id: 76, name: 'C++ (Clang 7.0.1)', version: 'Clang 7.0.1' },
  // C
  { id: 103, name: 'C (GCC 14.1.0)', version: 'GCC 14.1.0' },
  { id: 50, name: 'C (GCC 9.2.0)', version: 'GCC 9.2.0' },
  { id: 49, name: 'C (GCC 8.3.0)', version: 'GCC 8.3.0' },
  { id: 48, name: 'C (GCC 7.4.0)', version: 'GCC 7.4.0' },
  { id: 75, name: 'C (Clang 7.0.1)', version: 'Clang 7.0.1' },
  // Java
  { id: 91, name: 'Java (JDK 17.0.6)', version: 'JDK 17.0.6' },
  { id: 62, name: 'Java (OpenJDK 13.0.1)', version: 'OpenJDK 13.0.1' },
  // JavaScript
  { id: 102, name: 'JavaScript (Node.js 22.08.0)', version: 'Node.js 22.08.0' },
  { id: 97, name: 'JavaScript (Node.js 20.17.0)', version: 'Node.js 20.17.0' },
  { id: 63, name: 'JavaScript (Node.js 12.14.0)', version: 'Node.js 12.14.0' },
  // TypeScript
  { id: 74, name: 'TypeScript (3.7.4)', version: '3.7.4' },
  // Kotlin
  { id: 78, name: 'Kotlin (1.3.70)', version: '1.3.70' },
  // Rust
  { id: 73, name: 'Rust (1.40.0)', version: '1.40.0' },
  // Go
  { id: 60, name: 'Go (1.13.5)', version: '1.13.5' },
  // Ruby
  { id: 72, name: 'Ruby (2.7.0)', version: '2.7.0' },
  // C#
  { id: 51, name: 'C# (Mono 6.6.0.161)', version: 'Mono 6.6.0.161' },
  // Swift
  { id: 83, name: 'Swift (5.2.3)', version: '5.2.3' },
];

@Injectable()
export class AppService {
  getHealth(): HealthResponseDto {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  getLanguages(): LanguageResponseDto[] {
    return SUPPORTED_LANGUAGES;
  }
}

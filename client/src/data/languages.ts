/** Judge0 language ID → display name */
export const LANGUAGE_NAMES: Record<number, string> = {
  // Python
  113: 'Python (3.14.0)',
  109: 'Python (3.13.2)',
  71: 'Python (3.8.1)',
  70: 'Python (2.7.17)',
  // C++
  105: 'C++ (GCC 14.1.0)',
  54: 'C++ (GCC 9.2.0)',
  53: 'C++ (GCC 8.3.0)',
  52: 'C++ (GCC 7.4.0)',
  76: 'C++ (Clang 7.0.1)',
  // C
  103: 'C (GCC 14.1.0)',
  50: 'C (GCC 9.2.0)',
  49: 'C (GCC 8.3.0)',
  48: 'C (GCC 7.4.0)',
  75: 'C (Clang 7.0.1)',
  // Java
  91: 'Java (JDK 17.0.6)',
  62: 'Java (OpenJDK 13.0.1)',
  // JavaScript
  102: 'JavaScript (Node.js 22.08.0)',
  97: 'JavaScript (Node.js 20.17.0)',
  63: 'JavaScript (Node.js 12.14.0)',
  // TypeScript
  74: 'TypeScript (3.7.4)',
  // Kotlin
  78: 'Kotlin (1.3.70)',
  // Rust
  73: 'Rust (1.40.0)',
  // Go
  60: 'Go (1.13.5)',
  // Ruby
  72: 'Ruby (2.7.0)',
  // C#
  51: 'C# (Mono 6.6.0.161)',
  // Swift
  83: 'Swift (5.2.3)',
};

export function languageName(id: number): string {
  return LANGUAGE_NAMES[id] ?? String(id);
}

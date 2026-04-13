// Type declarations for monaco-editor ESM deep imports.
// The bundler moduleResolution requires exports map entries that monaco
// doesn't provide for its ESM subpaths, so we declare them here.
declare module 'monaco-editor/esm/vs/editor/editor.api' {
  export * from 'monaco-editor';
}

declare module 'monaco-editor/esm/vs/basic-languages/python/python.contribution' {}
declare module 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution' {}
declare module 'monaco-editor/esm/vs/basic-languages/java/java.contribution' {}
declare module 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution' {}

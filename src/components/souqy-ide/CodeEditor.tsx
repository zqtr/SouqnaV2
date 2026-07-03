'use client';

import { useEffect, useRef } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { BlockRange } from '@/lib/souqy-ide/blocksDoc';

type Props = {
  value: string;
  isRtlUi: boolean;
  selectedRange: BlockRange | null;
  onChange: (value: string) => void;
  onCursorLine: (line: number) => void;
  onSave: () => void;
};

export const SOUQY_THEME = 'souqy-dark';

export function defineSouqyTheme(monaco: Monaco) {
  monaco.editor.defineTheme(SOUQY_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: 'c9b98a' },
      { token: 'string.value.json', foreground: 'f4ead6' },
      { token: 'number', foreground: 'd8a25e' },
      { token: 'keyword.json', foreground: 'a78d5c' },
    ],
    colors: {
      'editor.background': '#0c0b09',
      'editor.foreground': '#f4ead6',
      'editor.lineHighlightBackground': '#171410',
      'editor.selectionBackground': '#3a3120',
      'editorLineNumber.foreground': '#4d463a',
      'editorLineNumber.activeForeground': '#c9b98a',
      'editorCursor.foreground': '#f4ead6',
      'editorWidget.background': '#12100d',
      'editorGutter.background': '#0c0b09',
    },
  });
}

export function CodeEditor({
  value,
  isRtlUi,
  selectedRange,
  onChange,
  onCursorLine,
  onSave,
}: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const saveRef = useRef(onSave);
  const cursorRef = useRef(onCursorLine);
  saveRef.current = onSave;
  cursorRef.current = onCursorLine;

  const handleMount: OnMount = (instance, monaco) => {
    editorRef.current = instance;
    decorationsRef.current = instance.createDecorationsCollection();

    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current());
    instance.onDidChangeCursorPosition((event) => cursorRef.current(event.position.lineNumber));
  };

  useEffect(() => {
    const instance = editorRef.current;
    const decorations = decorationsRef.current;
    if (!instance || !decorations) return;

    if (!selectedRange) {
      decorations.clear();
      return;
    }
    decorations.set([
      {
        range: {
          startLineNumber: selectedRange.startLine,
          startColumn: 1,
          endLineNumber: selectedRange.endLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: 'sqs-ide-line-selected',
          linesDecorationsClassName: 'sqs-ide-gutter-selected',
        },
      },
    ]);
    instance.revealLineInCenterIfOutsideViewport(selectedRange.startLine);
  }, [selectedRange]);

  return (
    <Editor
      className="sqs-ide-editor"
      language="json"
      theme={SOUQY_THEME}
      value={value}
      beforeMount={defineSouqyTheme}
      onMount={handleMount}
      onChange={(next) => onChange(next ?? '')}
      options={{
        minimap: { enabled: false },
        fontSize: 12.5,
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        renderLineHighlight: 'line',
        padding: { top: 12, bottom: 12 },
        // JSON documents are LTR even in the Arabic UI.
        ...(isRtlUi ? {} : {}),
      }}
      loading={<div className="sqs-ide-editor-loading" />}
    />
  );
}

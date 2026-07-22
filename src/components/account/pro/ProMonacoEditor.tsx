'use client';

import * as React from 'react';
import * as monaco from 'monaco-editor';
import type { EditorProps, OnMount } from '@monaco-editor/react';

type ProMonacoEditorProps = Pick<
  EditorProps,
  | 'defaultValue'
  | 'language'
  | 'onChange'
  | 'options'
  | 'path'
  | 'theme'
  | 'value'
> & {
  onMount?: OnMount;
};

/**
 * Souqna Code uses Monaco directly instead of the wrapper's AMD loader. The
 * loader waits on a remote VS bundle in Safari, which can leave the drawer in
 * a permanent loading state even though Monaco is already bundled locally.
 */
export default function ProMonacoEditor({
  defaultValue,
  language = 'plaintext',
  onChange,
  onMount,
  options,
  path,
  theme = 'vs-dark',
  value,
}: ProMonacoEditorProps) {
  const containerRef = React.useRef<HTMLElement | null>(null);
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = React.useRef<monaco.editor.ITextModel | null>(null);
  const suppressChangeRef = React.useRef(false);
  const sourceRef = React.useRef(value ?? defaultValue ?? '');
  const onChangeRef = React.useRef(onChange);
  const onMountRef = React.useRef(onMount);
  const optionsRef = React.useRef(options);
  const [mountError, setMountError] = React.useState<string | null>(null);

  sourceRef.current = value ?? defaultValue ?? '';
  onChangeRef.current = onChange;
  onMountRef.current = onMount;
  optionsRef.current = options;

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      const uri = path ? monaco.Uri.parse(path) : undefined;
      const existingModel = uri ? monaco.editor.getModel(uri) : null;
      const model =
        existingModel ?? monaco.editor.createModel(sourceRef.current, language, uri);

      if (existingModel && existingModel.getValue() !== sourceRef.current) {
        existingModel.setValue(sourceRef.current);
      }

      const getDimension = () => ({
        width: Math.max(container.clientWidth, 1),
        height: Math.max(container.clientHeight, 1),
      });
      const editor = monaco.editor.create(container, {
        ...optionsRef.current,
        dimension: getDimension(),
        model,
        theme,
      });
      const resizeObserver = new ResizeObserver(() => {
        editor.layout(getDimension());
      });
      resizeObserver.observe(container);
      const changeSubscription = model.onDidChangeContent((event) => {
        if (!suppressChangeRef.current) onChangeRef.current?.(model.getValue(), event);
      });

      editorRef.current = editor;
      modelRef.current = model;
      setMountError(null);
      onMountRef.current?.(editor, monaco);

      return () => {
        resizeObserver.disconnect();
        changeSubscription.dispose();
        editor.dispose();
        if (!existingModel) model.dispose();
        editorRef.current = null;
        modelRef.current = null;
      };
    } catch (error) {
      setMountError(error instanceof Error ? error.message : String(error));
    }
  }, [language, path, theme]);

  React.useEffect(() => {
    const model = modelRef.current;
    const nextValue = value ?? '';
    if (!model || model.getValue() === nextValue) return;

    suppressChangeRef.current = true;
    model.setValue(nextValue);
    suppressChangeRef.current = false;
  }, [value]);

  React.useEffect(() => {
    editorRef.current?.updateOptions(options ?? {});
  }, [options]);

  return (
    <section
      ref={containerRef}
      aria-label={
        mountError ? `Souqna Code editor error: ${mountError}` : 'Souqna Code editor'
      }
    />
  );
}

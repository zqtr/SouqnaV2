'use client';

import { DiffEditor } from '@monaco-editor/react';
import { defineSouqyTheme, SOUQY_THEME } from './CodeEditor';

type Props = {
  original: string;
  proposed: string;
};

export function ProposalDiff({ original, proposed }: Props) {
  return (
    <DiffEditor
      className="sqs-ide-editor"
      language="json"
      theme={SOUQY_THEME}
      original={original}
      modified={proposed}
      beforeMount={defineSouqyTheme}
      options={{
        readOnly: true,
        renderSideBySide: true,
        minimap: { enabled: false },
        fontSize: 12,
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
      }}
      loading={<div className="sqs-ide-editor-loading" />}
    />
  );
}

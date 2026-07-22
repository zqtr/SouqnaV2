'use client';

import * as React from 'react';
import type { BlockContext } from '@/components/storefront/blocks/BlockContext';

const BrowserSouqyContext = React.createContext<BlockContext | null>(null);

export function BrowserSouqyProvider({ context, children }: { context: BlockContext; children: React.ReactNode }) {
  return <BrowserSouqyContext.Provider value={context}>{children}</BrowserSouqyContext.Provider>;
}

export function useBrowserSouqyContext(): BlockContext {
  const context = React.useContext(BrowserSouqyContext);
  if (!context) throw new Error('Souqna Code runtime is missing its storefront context.');
  return context;
}

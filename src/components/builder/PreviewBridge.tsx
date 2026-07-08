'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Iframe-side companion to BuilderShell. Mounted only inside
 * /account/[slug]/preview. Responsibilities:
 *
 *   1. Reload the route when the parent posts `souqna:reload` so saved
 *      drafts show up without a full document reload.
 *   2. Map clicks on `[data-block-id]` elements to a `souqna:select`
 *      message back to the parent so the inspector follows the click.
 *   3. Visually highlight the currently-selected block when the parent
 *      posts `souqna:highlight`.
 *   4. On-canvas inline editing: double-clicking a `[data-edit-field]`
 *      element turns it into a contenteditable; committing posts
 *      `souqna:edit` `{ blockId, field, value }` so the parent writes it
 *      straight onto the block's prop of that name.
 */
export function PreviewBridge() {
  const router = useRouter();

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.source && ev.source !== window.parent && ev.origin !== window.location.origin) return;
      const data = ev.data as { type?: string; blockId?: string | null } | null;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'souqna:reload') {
        router.refresh();
      } else if (data.type === 'souqna:highlight') {
        applyHighlight(typeof data.blockId === 'string' ? data.blockId : null);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router]);

  useEffect(() => {
    function onClick(ev: MouseEvent) {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      // A click inside a field being edited must place the caret, not
      // re-select the block (which would blur the editor).
      if (target.closest('[data-editing="true"]')) return;
      const node = target.closest<HTMLElement>('[data-block-id]');
      if (!node) return;
      const blockId = node.dataset.blockId;
      if (!blockId) return;
      ev.preventDefault();
      ev.stopPropagation();
      window.parent?.postMessage({ type: 'souqna:select', blockId }, '*');
      applyHighlight(blockId);
    }
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true } as never);
  }, []);

  // ── Inline editing ─────────────────────────────────────────────────
  useEffect(() => {
    let editing: HTMLElement | null = null;
    let original = '';

    function finish(el: HTMLElement, commit: boolean) {
      const blockId = el.closest<HTMLElement>('[data-block-id]')?.dataset.blockId;
      const field = el.dataset.editField;
      const value = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-editing');
      el.style.outline = '';
      el.style.cursor = '';
      editing = null;
      if (commit && blockId && field && value && value !== original.trim()) {
        window.parent?.postMessage({ type: 'souqna:edit', blockId, field, value }, '*');
      } else if (!commit) {
        el.textContent = original;
      }
    }

    function beginEdit(el: HTMLElement) {
      if (editing && editing !== el) finish(editing, true);
      editing = el;
      original = el.textContent ?? '';
      // `plaintext-only` keeps pasted rich text out; some engines only
      // accept `true`, which is fine — we sanitise on commit anyway.
      el.setAttribute('contenteditable', 'plaintext-only');
      if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true');
      el.dataset.editing = 'true';
      el.style.outline = '2px solid var(--sf-accent, #c9a961)';
      el.style.outlineOffset = '4px';
      el.style.cursor = 'text';
      el.focus();
      // Select the whole field so typing replaces it — the common intent.
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    function onDblClick(ev: MouseEvent) {
      const target = ev.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>('[data-edit-field]');
      if (!el) return;
      ev.preventDefault();
      ev.stopPropagation();
      beginEdit(el);
    }

    function onKeyDown(ev: KeyboardEvent) {
      if (!editing) return;
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        finish(editing, true);
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        finish(editing, false);
      }
    }

    function onFocusOut(ev: FocusEvent) {
      if (editing && ev.target === editing) finish(editing, true);
    }

    document.addEventListener('dblclick', onDblClick, { capture: true });
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusout', onFocusOut, true);
    return () => {
      document.removeEventListener('dblclick', onDblClick, { capture: true } as never);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusout', onFocusOut, true);
    };
  }, []);

  return null;
}

function applyHighlight(blockId: string | null) {
  document.querySelectorAll<HTMLElement>('[data-block-id]').forEach((el) => {
    if (el.dataset.blockId === blockId) {
      el.style.outline = '2px solid #E8DCC4';
      el.style.outlineOffset = '4px';
      el.style.cursor = 'pointer';
    } else {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.cursor = 'pointer';
    }
  });
}

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
 *   5. Optimistic text patching: `souqna:patch` `{ blockId, field, value }`
 *      writes the new text straight into the matching `[data-edit-field]`
 *      node so inspector edits appear instantly — the debounced save +
 *      `souqna:reload` that follows makes the DOM consistent for real.
 *   6. `souqna:scroll` `{ blockId }` smooth-scrolls the preview to a
 *      block. Retries briefly because a freshly added block only exists
 *      in the DOM after the save → refresh round-trip lands.
 */
export function PreviewBridge() {
  const router = useRouter();

  useEffect(() => {
    let scrollTimer: number | null = null;

    function scrollToBlock(blockId: string, attempt = 0) {
      const el = document.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (attempt >= 16) return;
      scrollTimer = window.setTimeout(() => scrollToBlock(blockId, attempt + 1), 300);
    }

    // Re-assert the selection ring whenever the preview DOM changes.
    // Two cases need it: a saved-draft refresh can rebuild the selected
    // block's element (dropping its imperative outline), and a freshly
    // added block only exists *after* the refresh — the parent's
    // highlight message fired before there was anything to outline.
    // Watching childList only (not attributes) keeps applyHighlight's
    // own style writes from re-triggering the observer.
    let highlightRaf: number | null = null;
    const observer = new MutationObserver(() => {
      if (highlightRaf !== null || lastHighlightId === null) return;
      highlightRaf = window.requestAnimationFrame(() => {
        highlightRaf = null;
        applyHighlight(lastHighlightId);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    function onMessage(ev: MessageEvent) {
      if (ev.source && ev.source !== window.parent && ev.origin !== window.location.origin) return;
      const data = ev.data as {
        type?: string;
        blockId?: string | null;
        field?: string;
        value?: string;
      } | null;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'souqna:reload') {
        router.refresh();
      } else if (data.type === 'souqna:highlight') {
        applyHighlight(typeof data.blockId === 'string' ? data.blockId : null);
      } else if (
        data.type === 'souqna:patch' &&
        typeof data.blockId === 'string' &&
        typeof data.field === 'string' &&
        typeof data.value === 'string'
      ) {
        applyTextPatch(data.blockId, data.field, data.value);
      } else if (data.type === 'souqna:scroll' && typeof data.blockId === 'string') {
        if (scrollTimer !== null) window.clearTimeout(scrollTimer);
        scrollToBlock(data.blockId);
      }
    }
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (scrollTimer !== null) window.clearTimeout(scrollTimer);
      observer.disconnect();
      if (highlightRaf !== null) window.cancelAnimationFrame(highlightRaf);
    };
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

// Last id applyHighlight was asked to outline — the MutationObserver
// above re-applies it after DOM swaps so the ring survives refreshes.
let lastHighlightId: string | null = null;

function applyHighlight(blockId: string | null) {
  lastHighlightId = blockId;
  document.querySelectorAll<HTMLElement>('[data-block-id]').forEach((el) => {
    if (el.dataset.blockId === blockId) {
      // Same gold accent the inline editor uses — the old pale sand
      // (#E8DCC4) disappeared entirely on light storefront backgrounds.
      el.style.outline = '2px solid var(--sf-accent, #C9A961)';
      el.style.outlineOffset = '4px';
      el.style.cursor = 'pointer';
    } else {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.cursor = 'pointer';
    }
  });
}

/**
 * Write an inspector text edit straight into the preview DOM. Only
 * fields wired with `data-edit-field` (the same hook inline editing
 * uses) can be patched; anything else silently no-ops and waits for the
 * saved-draft refresh. Skips a node the founder is actively editing so
 * we never clobber their caret.
 */
function applyTextPatch(blockId: string, field: string, value: string) {
  const root = document.querySelector<HTMLElement>(
    `[data-block-id="${CSS.escape(blockId)}"]`,
  );
  if (!root) return;
  const selector = `[data-edit-field="${CSS.escape(field)}"]`;
  const el = root.matches(selector) ? root : root.querySelector<HTMLElement>(selector);
  if (!el || el.dataset.editing === 'true') return;
  if (el.textContent !== value) el.textContent = value;
}

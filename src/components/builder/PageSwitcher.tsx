'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  createStorefrontPage,
  deleteStorefrontPage,
  publishStorefrontPage,
  renameStorefrontPage,
  reorderStorefrontPages,
  setStorefrontHomePage,
  setStorefrontPageSeo,
  toggleStorefrontPageInNav,
} from '@/app/actions/pages';
import { updateSystemPageEnabled } from '@/app/actions/systemPages';
import {
  isReservedPageSlug,
  normalizePageSlug,
  type StorefrontPage,
} from '@/lib/storefrontPages';
import { MediaUploader } from './MediaUploader';
import { useBuilderCopy } from './BuilderCopyContext';

type Props = {
  slug: string;
  pages: StorefrontPage[];
  activePageId: string;
  activeSystemPage?: 'checkout' | 'products' | null;
  systemPages?: {
    productsEnabled: boolean;
  };
  onSystemPageEnabledChange?: (page: 'products', enabled: boolean) => void;
  onBeforeSwitch?: () => Promise<void> | void;
  giphyStorefrontSlug?: string;
};

type Toast = { id: number; kind: 'ok' | 'err'; message: string };

type PageSwitcherText = {
  pages: string;
  addPage: string;
  edit: string;
  systemPage: string;
  systemBadge: string;
  offBadge: string;
  checkoutTitle: string;
  checkoutSubtitle: string;
  productsTitle: string;
  productsSubtitle: string;
  turnOn: string;
  turnOff: string;
  dragToReorder: string;
  homePinned: string;
  pageActions: string;
  homeBadge: string;
  navBadge: string;
  editingBadge: string;
  rename: string;
  setAsHomepage: string;
  onlyPageExists: string;
  hideFromNav: string;
  showInNav: string;
  editSeo: string;
  publishPage: string;
  noDraftChanges: string;
  deletePage: string;
  published: string;
  draftAhead: string;
  draftOnly: string;
  homePageToast: (title: string) => string;
  hiddenNavToast: (title: string) => string;
  shownNavToast: (title: string) => string;
  createdToast: (title: string) => string;
  publishedToast: (title: string) => string;
  deletedToast: (title: string) => string;
  renamedToast: (title: string) => string;
  seoUpdatedToast: (title: string) => string;
  systemPageToggledToast: (title: string, enabled: boolean) => string;
  deleteConfirmTitle: (title: string) => string;
  deleteConfirmBody: string;
  addPageTitle: string;
  renamePageTitle: string;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  slugLabel: string;
  slugPlaceholder: string;
  homeSlugHint: string;
  slugHint: string;
  missingTitleError: string;
  invalidSlugError: string;
  reservedSlugError: string;
  duplicateFromLabel: string;
  duplicateFromHint: string;
  blankPageOption: string;
  save: string;
  cancel: string;
  working: string;
  seoTitle: (title: string) => string;
  editSeoAria: (title: string) => string;
  seoTitleHint: string;
  seoDescriptionHint: string;
  openGraphImageLabel: string;
  openGraphImageHint: string;
  saveSeo: string;
};

function pageSwitcherText(locale: 'en' | 'ar'): PageSwitcherText {
  if (locale === 'ar') {
    return {
      pages: '\u0627\u0644\u0635\u0641\u062d\u0627\u062a',
      addPage: '\u0625\u0636\u0627\u0641\u0629 \u0635\u0641\u062d\u0629',
      edit: '\u062a\u062d\u0631\u064a\u0631',
      systemPage: '\u0635\u0641\u062d\u0629 \u0646\u0638\u0627\u0645',
      systemBadge: '\u0646\u0638\u0627\u0645',
      offBadge: '\u0645\u0637\u0641\u0623',
      checkoutTitle: '\u0627\u0644\u062f\u0641\u0639',
      checkoutSubtitle: '\u0635\u0641\u062d\u0629 \u062f\u0641\u0639 \u0645\u062a\u062d\u0643\u0645 \u0628\u0647\u0627',
      productsTitle: '\u0643\u0644 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
      productsSubtitle: '\u0643\u062a\u0627\u0644\u0648\u062c \u0645\u0646\u062a\u062c\u0627\u062a \u0645\u0639 \u0641\u0644\u0627\u062a\u0631',
      turnOn: '\u062a\u0634\u063a\u064a\u0644',
      turnOff: '\u0625\u064a\u0642\u0627\u0641',
      dragToReorder: '\u0627\u0633\u062d\u0628 \u0644\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062a\u0631\u062a\u064a\u0628',
      homePinned: '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629 \u0645\u062b\u0628\u062a\u0629',
      pageActions: '\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0635\u0641\u062d\u0629',
      homeBadge: '\u0631\u0626\u064a\u0633\u064a\u0629',
      navBadge: '\u062a\u0646\u0642\u0644',
      editingBadge: '\u062a\u062d\u0631\u064a\u0631',
      rename: '\u0625\u0639\u0627\u062f\u0629 \u062a\u0633\u0645\u064a\u0629',
      setAsHomepage: '\u062c\u0639\u0644\u0647\u0627 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
      onlyPageExists: '\u062a\u0648\u062c\u062f \u0635\u0641\u062d\u0629 \u0648\u0627\u062d\u062f\u0629 \u0641\u0642\u0637.',
      hideFromNav: '\u0625\u062e\u0641\u0627\u0621 \u0645\u0646 \u0627\u0644\u062a\u0646\u0642\u0644',
      showInNav: '\u0625\u0638\u0647\u0627\u0631 \u0641\u064a \u0627\u0644\u062a\u0646\u0642\u0644',
      editSeo: '\u062a\u062d\u0631\u064a\u0631 SEO',
      publishPage: '\u0646\u0634\u0631 \u0627\u0644\u0635\u0641\u062d\u0629',
      noDraftChanges: '\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u063a\u064a\u064a\u0631\u0627\u062a \u0645\u0633\u0648\u062f\u0629 \u0644\u0644\u0646\u0634\u0631.',
      deletePage: '\u062d\u0630\u0641 \u0627\u0644\u0635\u0641\u062d\u0629',
      published: '\u0645\u0646\u0634\u0648\u0631\u0629',
      draftAhead: '\u0627\u0644\u0645\u0633\u0648\u062f\u0629 \u0623\u062d\u062f\u062b \u0645\u0646 \u0627\u0644\u0645\u0646\u0634\u0648\u0631',
      draftOnly: '\u0645\u0633\u0648\u062f\u0629 \u0641\u0642\u0637',
      homePageToast: (title) => `\u201c${title}\u201d \u0623\u0635\u0628\u062d\u062a \u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629.`,
      hiddenNavToast: (title) => `\u062a\u0645 \u0625\u062e\u0641\u0627\u0621 \u201c${title}\u201d \u0645\u0646 \u0627\u0644\u062a\u0646\u0642\u0644.`,
      shownNavToast: (title) => `\u062a\u0645 \u0625\u0638\u0647\u0627\u0631 \u201c${title}\u201d \u0641\u064a \u0627\u0644\u062a\u0646\u0642\u0644.`,
      createdToast: (title) => `\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u201c${title}\u201d.`,
      publishedToast: (title) => `\u062a\u0645 \u0646\u0634\u0631 \u201c${title}\u201d.`,
      deletedToast: (title) => `\u062a\u0645 \u062d\u0630\u0641 \u201c${title}\u201d.`,
      renamedToast: (title) => `\u062a\u0645\u062a \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062a\u0633\u0645\u064a\u0629 \u0625\u0644\u0649 \u201c${title}\u201d.`,
      seoUpdatedToast: (title) => `\u062a\u0645 \u062a\u062d\u062f\u064a\u062b SEO \u0644\u0635\u0641\u062d\u0629 \u201c${title}\u201d.`,
      systemPageToggledToast: (title, enabled) =>
        enabled
          ? `\u062a\u0645 \u062a\u0634\u063a\u064a\u0644 \u201c${title}\u201d.`
          : `\u062a\u0645 \u0625\u064a\u0642\u0627\u0641 \u201c${title}\u201d.`,
      deleteConfirmTitle: (title) => `\u062d\u0630\u0641 \u201c${title}\u201d\u061f`,
      deleteConfirmBody:
        '\u0633\u064a\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0635\u0641\u062d\u0629 \u0648\u0645\u0633\u0648\u062f\u0627\u062a\u0647\u0627 \u0648\u0643\u062a\u0644\u0647\u0627 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629 \u0646\u0647\u0627\u0626\u064a\u064b\u0627. \u0644\u0627 \u064a\u0645\u0643\u0646 \u0627\u0644\u062a\u0631\u0627\u062c\u0639 \u0639\u0646 \u0647\u0630\u0627.',
      addPageTitle: '\u0625\u0636\u0627\u0641\u0629 \u0635\u0641\u062d\u0629',
      renamePageTitle: '\u0625\u0639\u0627\u062f\u0629 \u062a\u0633\u0645\u064a\u0629 \u0627\u0644\u0635\u0641\u062d\u0629',
      titleLabel: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646',
      titlePlaceholder: '\u0645\u0646 \u0646\u062d\u0646',
      descriptionLabel: '\u0627\u0644\u0648\u0635\u0641',
      slugLabel: '\u0627\u0644\u0631\u0627\u0628\u0637',
      slugPlaceholder: 'about',
      homeSlugHint: '\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629 \u062b\u0627\u0628\u062a.',
      slugHint: '\u0623\u062d\u0631\u0641 \u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 \u0635\u063a\u064a\u0631\u0629\u060c \u0623\u0631\u0642\u0627\u0645\u060c \u0648\u0634\u0631\u0637\u0627\u062a.',
      missingTitleError: '\u0623\u0636\u0641 \u0639\u0646\u0648\u0627\u0646\u064b\u0627 \u0644\u0644\u0635\u0641\u062d\u0629.',
      invalidSlugError:
        '\u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u062d\u062a\u0648\u064a \u0627\u0644\u0631\u0627\u0628\u0637 \u0639\u0644\u0649 \u0623\u062d\u0631\u0641 \u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 \u0635\u063a\u064a\u0631\u0629 \u0648\u0623\u0631\u0642\u0627\u0645 \u0648\u0634\u0631\u0637\u0627\u062a \u0641\u0642\u0637.',
      reservedSlugError:
        '\u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0645\u062d\u062c\u0648\u0632 \u0644\u0633\u0648\u0642\u0646\u0627. \u0627\u062e\u062a\u0631 \u0631\u0627\u0628\u0637\u064b\u0627 \u0622\u062e\u0631.',
      duplicateFromLabel: '\u0646\u0633\u062e \u0645\u0646',
      duplicateFromHint:
        '\u0627\u062e\u062a\u064a\u0627\u0631\u064a - \u064a\u0646\u0633\u062e \u0627\u0644\u0643\u062a\u0644 \u0648SEO \u0645\u0646 \u0635\u0641\u062d\u0629 \u0623\u062e\u0631\u0649.',
      blankPageOption: '(\u0641\u0627\u0631\u063a\u0629)',
      save: '\u062d\u0641\u0638',
      cancel: '\u0625\u0644\u063a\u0627\u0621',
      working: '\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u0646\u0641\u064a\u0630\u2026',
      seoTitle: (title) => `SEO \u00b7 ${title}`,
      editSeoAria: (title) => `\u062a\u062d\u0631\u064a\u0631 SEO \u0644\u0635\u0641\u062d\u0629 ${title}`,
      seoTitleHint: '\u064a\u0638\u0647\u0631 \u0641\u064a \u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0628\u062d\u062b \u0648\u062a\u0628\u0648\u064a\u0628 \u0627\u0644\u0645\u062a\u0635\u0641\u062d.',
      seoDescriptionHint: '\u062c\u0645\u0644\u0629 \u0623\u0648 \u062c\u0645\u0644\u062a\u0627\u0646 \u0644\u0645\u0642\u062a\u0637\u0641\u0627\u062a \u0627\u0644\u0628\u062d\u062b.',
      openGraphImageLabel: '\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629',
      openGraphImageHint: '\u062a\u0638\u0647\u0631 \u0639\u0646\u062f \u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0635\u0641\u062d\u0629 \u0639\u0644\u0649 \u0627\u0644\u0634\u0628\u0643\u0627\u062a.',
      saveSeo: '\u062d\u0641\u0638 SEO',
    };
  }
  return {
    pages: 'Pages',
    addPage: 'Add page',
    edit: 'Edit',
    systemPage: 'System page',
    systemBadge: 'System',
    offBadge: 'Off',
    checkoutTitle: 'Checkout',
    checkoutSubtitle: 'Controlled checkout page',
    productsTitle: 'All Products',
    productsSubtitle: 'Filtered product catalogue',
    turnOn: 'Turn on',
    turnOff: 'Turn off',
    dragToReorder: 'Drag to reorder',
    homePinned: 'Home is pinned',
    pageActions: 'Page actions',
    homeBadge: 'home',
    navBadge: 'nav',
    editingBadge: 'editing',
    rename: 'Rename',
    setAsHomepage: 'Set as homepage',
    onlyPageExists: 'Only one page exists.',
    hideFromNav: 'Hide from nav',
    showInNav: 'Show in nav',
    editSeo: 'Edit SEO',
    publishPage: 'Publish page',
    noDraftChanges: 'No draft changes to publish.',
    deletePage: 'Delete page',
    published: 'Published',
    draftAhead: 'Draft ahead of published',
    draftOnly: 'Draft only',
    homePageToast: (title) => `“${title}” is now the home page.`,
    hiddenNavToast: (title) => `Hid “${title}” from the nav.`,
    shownNavToast: (title) => `Showed “${title}” in the nav.`,
    createdToast: (title) => `Created “${title}”.`,
    publishedToast: (title) => `Published “${title}”.`,
    deletedToast: (title) => `Deleted “${title}”.`,
    renamedToast: (title) => `Renamed to “${title}”.`,
    seoUpdatedToast: (title) => `Updated SEO on “${title}”.`,
    systemPageToggledToast: (title, enabled) =>
      `${title} is now ${enabled ? 'on' : 'off'}.`,
    deleteConfirmTitle: (title) => `Delete “${title}”?`,
    deleteConfirmBody:
      'This permanently removes the page and its draft + published blocks. This can’t be undone.',
    addPageTitle: 'Add page',
    renamePageTitle: 'Rename page',
    titleLabel: 'Title',
    titlePlaceholder: 'About',
    descriptionLabel: 'Description',
    slugLabel: 'Slug',
    slugPlaceholder: 'about',
    homeSlugHint: 'The home page slug is fixed.',
    slugHint: 'Lowercase letters, numbers, dashes.',
    missingTitleError: 'Give the page a title.',
    invalidSlugError: 'Slug can only contain lowercase letters, numbers, and dashes.',
    reservedSlugError: 'That slug is reserved by Souqna. Pick another.',
    duplicateFromLabel: 'Duplicate from',
    duplicateFromHint: 'Optional - copies blocks + SEO from another page.',
    blankPageOption: '(blank)',
    save: 'Save',
    cancel: 'Cancel',
    working: 'Working…',
    seoTitle: (title) => `SEO · ${title}`,
    editSeoAria: (title) => `Edit SEO for ${title}`,
    seoTitleHint: 'Shown in search results and the browser tab.',
    seoDescriptionHint: 'One or two sentences for search snippets.',
    openGraphImageLabel: 'Open Graph image',
    openGraphImageHint: 'Shown when the page is shared on social networks.',
    saveSeo: 'Save SEO',
  };
}

type PageMutation =
  | { kind: 'create' }
  | { kind: 'rename'; page: StorefrontPage }
  | { kind: 'seo'; page: StorefrontPage }
  | { kind: 'delete'; page: StorefrontPage };

/**
 * PageSwitcher — left-rail multi-page management panel.
 *
 * Lists every page in `storefront_pages` (home pinned, others sortable),
 * surfaces draft/published status, and exposes the page lifecycle
 * actions (create, rename, set-as-home, toggle-in-nav, edit SEO,
 * publish, delete) backed by `src/app/actions/pages.ts`.
 *
 * Drag-and-drop reorder uses a separate `DndContext` from the
 * BuilderShell's main canvas DnD — the two never share active items
 * (canvas drags blocks; this drags `page:<id>` ids), so collisions are
 * impossible and isolating the context keeps the implementations
 * independent.
 */
export function PageSwitcher({
  slug,
  pages,
  activePageId,
  activeSystemPage = null,
  systemPages = { productsEnabled: true },
  onSystemPageEnabledChange,
  onBeforeSwitch,
  giphyStorefrontSlug,
}: Props) {
  const router = useRouter();
  const { locale } = useBuilderCopy();
  const text = useMemo(() => pageSwitcherText(locale), [locale]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [mutation, setMutation] = useState<PageMutation | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, startTransition] = useTransition();
  // Local optimistic order so the dragged row settles immediately
  // instead of snapping back while we wait for the server action +
  // refresh. Synced from props on every props.pages change so external
  // mutations (publish, rename) propagate.
  const [localOrder, setLocalOrder] = useState<string[]>(() =>
    pages.map((p) => p.id),
  );
  useEffect(() => {
    setLocalOrder(pages.map((p) => p.id));
  }, [pages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byId = useMemo(() => {
    const map = new Map<string, StorefrontPage>();
    for (const p of pages) map.set(p.id, p);
    return map;
  }, [pages]);

  const orderedPages = useMemo<StorefrontPage[]>(() => {
    const home = pages.find((p) => p.isHome);
    const rest = localOrder
      .map((id) => byId.get(id))
      .filter((p): p is StorefrontPage => Boolean(p) && !p!.isHome);
    return home ? [home, ...rest] : rest;
  }, [byId, localOrder, pages]);

  const sortableIds = useMemo(
    () => orderedPages.filter((p) => !p.isHome).map((p) => p.id),
    [orderedPages],
  );

  const pushToast = useCallback((kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const goToPage = useCallback(
    async (pageSlug: string) => {
      if (onBeforeSwitch) await onBeforeSwitch();
      const params = new URLSearchParams();
      params.set('store', slug);
      if (pageSlug !== 'home') params.set('page', pageSlug);
      router.push(`/account/builder?${params.toString()}`);
    },
    [onBeforeSwitch, router, slug],
  );

  const goToSystemPage = useCallback(
    async (pageSlug: 'checkout' | 'products') => {
      if (onBeforeSwitch) await onBeforeSwitch();
      const params = new URLSearchParams();
      params.set('store', slug);
      params.set('page', pageSlug);
      router.push(`/account/builder?${params.toString()}`);
    },
    [onBeforeSwitch, router, slug],
  );

  // ---- mutations ---------------------------------------------------------

  const handleSetHome = useCallback(
    async (page: StorefrontPage) => {
      if (page.isHome) return;
      setBusyId(page.id);
      const res = await setStorefrontHomePage({ slug, pageId: page.id });
      setBusyId(null);
      if (res.status === 'error') {
        pushToast('err', res.message);
        return;
      }
      pushToast('ok', text.homePageToast(page.title));
      refresh();
    },
    [pushToast, refresh, slug, text],
  );

  const handleToggleNav = useCallback(
    async (page: StorefrontPage) => {
      setBusyId(page.id);
      const res = await toggleStorefrontPageInNav({
        slug,
        pageId: page.id,
        showInNav: !page.showInNav,
      });
      setBusyId(null);
      if (res.status === 'error') {
        pushToast('err', res.message);
        return;
      }
      pushToast(
        'ok',
        page.showInNav ? text.hiddenNavToast(page.title) : text.shownNavToast(page.title),
      );
      refresh();
    },
    [pushToast, refresh, slug, text],
  );

  const handlePublish = useCallback(
    async (page: StorefrontPage) => {
      setBusyId(page.id);
      const res = await publishStorefrontPage({ slug, pageId: page.id });
      setBusyId(null);
      if (res.status === 'error') {
        pushToast('err', res.message);
        return;
      }
      pushToast('ok', text.publishedToast(page.title));
      refresh();
    },
    [pushToast, refresh, slug, text],
  );

  const handleDelete = useCallback(
    async (page: StorefrontPage) => {
      setBusyId(page.id);
      const res = await deleteStorefrontPage({ slug, pageId: page.id });
      setBusyId(null);
      setMutation(null);
      if (res.status === 'error') {
        pushToast('err', res.message);
        return;
      }
      pushToast('ok', text.deletedToast(page.title));
      // If the founder deleted the page they were editing, route back
      // to home so the canvas doesn't 404 on next refresh.
      if (page.id === activePageId) {
        const params = new URLSearchParams();
        params.set('store', slug);
        router.push(`/account/builder?${params.toString()}`);
      } else {
        refresh();
      }
    },
    [activePageId, pushToast, refresh, router, slug, text],
  );

  const handleToggleSystemPage = useCallback(
    async (page: 'products', enabled: boolean) => {
      const busyKey = `system:${page}`;
      setBusyId(busyKey);
      const res = await updateSystemPageEnabled({ slug, page, enabled });
      setBusyId(null);
      if (res.status === 'error') {
        pushToast('err', res.message);
        return;
      }
      onSystemPageEnabledChange?.(page, enabled);
      pushToast('ok', text.systemPageToggledToast(text.productsTitle, enabled));
      refresh();
    },
    [onSystemPageEnabledChange, pushToast, refresh, slug, text],
  );

  const handleReorderEnd = useCallback(
    async (e: DragEndEvent) => {
      const activeId = String(e.active.id);
      const overId = e.over ? String(e.over.id) : null;
      if (!overId || overId === activeId) return;

      // Order tracked here is for the non-home portion only — DnD ids
      // are never the home row (it's not registered with sortable).
      const nonHome = localOrder.filter(
        (id) => byId.get(id) && !byId.get(id)!.isHome,
      );
      const from = nonHome.indexOf(activeId);
      const to = nonHome.indexOf(overId);
      if (from === -1 || to === -1) return;
      const reordered = arrayMove(nonHome, from, to);
      const home = pages.find((p) => p.isHome);
      const nextOrder = home ? [home.id, ...reordered] : reordered;
      setLocalOrder(nextOrder);

      const res = await reorderStorefrontPages({
        slug,
        pageIdsInOrder: nextOrder,
      });
      if (res.status === 'error') {
        pushToast('err', res.message);
        setLocalOrder(pages.map((p) => p.id));
        return;
      }
      refresh();
    },
    [byId, localOrder, pages, pushToast, refresh, slug],
  );

  // ---- render ------------------------------------------------------------

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 6,
          borderBottom: '1px solid var(--bld-divider)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--bld-text-muted)',
          }}
        >
          {text.pages} · {pages.length + 2}
        </span>
        <button
          type="button"
          onClick={() => setMutation({ kind: 'create' })}
          style={iconButtonStyle()}
          aria-label={text.addPage}
          title={text.addPage}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleReorderEnd}>
        <ul
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            margin: 0,
            padding: 0,
            listStyle: 'none',
          }}
        >
          {orderedPages.map((page) => {
            const isActive = activeSystemPage == null && page.id === activePageId;
            if (page.isHome) {
              return (
                <PageRow
                  key={page.id}
                  page={page}
                  isActive={isActive}
                  busy={busyId === page.id}
                  menuOpen={openMenuId === page.id}
                  onMenuToggle={() =>
                    setOpenMenuId((id) => (id === page.id ? null : page.id))
                  }
                  onMenuClose={() => setOpenMenuId(null)}
                  onSelect={() => {
                    if (!isActive) void goToPage(page.slug);
                  }}
                  onAction={(action) => {
                    setOpenMenuId(null);
                    if (action === 'rename') setMutation({ kind: 'rename', page });
                    if (action === 'seo') setMutation({ kind: 'seo', page });
                    if (action === 'toggle-nav') void handleToggleNav(page);
                    if (action === 'publish') void handlePublish(page);
                  }}
                  onlyPage={pages.length === 1}
                  text={text}
                />
              );
            }
            return (
              <SortablePageRow
                key={page.id}
                page={page}
                isActive={isActive}
                busy={busyId === page.id}
                menuOpen={openMenuId === page.id}
                onMenuToggle={() =>
                  setOpenMenuId((id) => (id === page.id ? null : page.id))
                }
                onMenuClose={() => setOpenMenuId(null)}
                onSelect={() => {
                  if (!isActive) void goToPage(page.slug);
                }}
                onAction={(action) => {
                  setOpenMenuId(null);
                  if (action === 'rename') setMutation({ kind: 'rename', page });
                  if (action === 'seo') setMutation({ kind: 'seo', page });
                  if (action === 'toggle-nav') void handleToggleNav(page);
                  if (action === 'set-home') void handleSetHome(page);
                  if (action === 'publish') void handlePublish(page);
                  if (action === 'delete') setMutation({ kind: 'delete', page });
                }}
                onlyPage={pages.length === 1}
                text={text}
              />
            );
          })}
          <SystemPageRow
            title={text.checkoutTitle}
            subtitle={text.checkoutSubtitle}
            isActive={activeSystemPage === 'checkout'}
            text={text}
            onSelect={() => {
              if (activeSystemPage !== 'checkout') void goToSystemPage('checkout');
            }}
          />
          <SystemPageRow
            title={text.productsTitle}
            subtitle={text.productsSubtitle}
            isActive={activeSystemPage === 'products'}
            enabled={systemPages.productsEnabled}
            busy={busyId === 'system:products'}
            text={text}
            onToggle={(enabled) => void handleToggleSystemPage('products', enabled)}
            onSelect={() => {
              if (activeSystemPage !== 'products') void goToSystemPage('products');
            }}
          />
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            {/* Sortable items already rendered above in `orderedPages`
              — the SortableContext just registers their ids so the
              dnd-kit collision detector knows which ones to track. */}
            <span style={{ display: 'none' }} />
          </SortableContext>
        </ul>
      </DndContext>

      {mutation?.kind === 'create' ? (
        <PageFormModal
          mode="create"
          slug={slug}
          text={text}
          existingPages={pages}
          onClose={() => setMutation(null)}
          onSuccess={(newSlug, message) => {
            setMutation(null);
            pushToast('ok', message);
            const params = new URLSearchParams();
            params.set('store', slug);
            if (newSlug !== 'home') params.set('page', newSlug);
            router.push(`/account/builder?${params.toString()}`);
          }}
          onError={(message) => pushToast('err', message)}
        />
      ) : null}

      {mutation?.kind === 'rename' ? (
        <PageFormModal
          mode="rename"
          slug={slug}
          text={text}
          existingPages={pages}
          page={mutation.page}
          onClose={() => setMutation(null)}
          onSuccess={(_newSlug, message) => {
            setMutation(null);
            pushToast('ok', message);
            refresh();
          }}
          onError={(message) => pushToast('err', message)}
        />
      ) : null}

      {mutation?.kind === 'seo' ? (
        <PageSeoModal
          slug={slug}
          page={mutation.page}
          text={text}
          giphyStorefrontSlug={giphyStorefrontSlug}
          onClose={() => setMutation(null)}
          onSuccess={(message) => {
            setMutation(null);
            pushToast('ok', message);
            refresh();
          }}
          onError={(message) => pushToast('err', message)}
        />
      ) : null}

      {mutation?.kind === 'delete' ? (
        <ConfirmDialog
          title={text.deleteConfirmTitle(mutation.page.title)}
          body={text.deleteConfirmBody}
          confirmLabel={text.deletePage}
          cancelLabel={text.cancel}
          workingLabel={text.working}
          danger
          busy={busyId === mutation.page.id}
          onCancel={() => setMutation(null)}
          onConfirm={() => handleDelete(mutation.page)}
        />
      ) : null}

      <ToastStack toasts={toasts} />
    </div>
  );
}

// ---- row components -----------------------------------------------------

type RowAction =
  | 'rename'
  | 'set-home'
  | 'toggle-nav'
  | 'seo'
  | 'publish'
  | 'delete';

type RowProps = {
  page: StorefrontPage;
  isActive: boolean;
  busy: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onSelect: () => void;
  onAction: (action: RowAction) => void;
  /** True when this is the storefront's only page — disables Delete /
   *  Set-as-home tooltips that would otherwise leave the storefront
   *  without a home page. */
  onlyPage: boolean;
  text: PageSwitcherText;
};

function SystemPageRow({
  title,
  subtitle,
  isActive,
  enabled = true,
  busy = false,
  text,
  onToggle,
  onSelect,
}: {
  title: string;
  subtitle: string;
  isActive: boolean;
  enabled?: boolean;
  busy?: boolean;
  text: PageSwitcherText;
  onToggle?: (enabled: boolean) => void;
  onSelect: () => void;
}) {
  return (
    <li style={{ position: 'relative', listStyle: 'none' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          borderRadius: 6,
          border: `1px solid ${
            isActive ? 'var(--bld-accent-line)' : 'var(--bld-divider)'
          }`,
          background: isActive ? 'var(--bld-accent-soft)' : 'var(--bld-tile-bg)',
          transition: 'background 140ms, border-color 140ms',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 18,
            height: 22,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isActive ? 'var(--bld-accent)' : 'var(--bld-text-muted)',
          }}
          title={text.systemPage}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M7 8h10M7 12h6M15 16h2" />
          </svg>
        </span>
        <button
          type="button"
          onClick={onSelect}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 2,
            padding: 0,
            background: 'transparent',
            border: 'none',
            color: 'var(--bld-text)',
            cursor: 'pointer',
            textAlign: 'start',
            minWidth: 0,
          }}
          aria-current={isActive ? 'page' : undefined}
          aria-label={`${text.edit} ${title}`}
        >
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 13,
              lineHeight: 1.2,
              fontWeight: isActive ? 600 : 500,
              color: 'var(--bld-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 180,
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'var(--bld-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 180,
            }}
          >
            {subtitle}
          </span>
        </button>
        <Badge kind={enabled ? (isActive ? 'editing' : 'nav') : 'disabled'}>
          {enabled ? text.systemBadge : text.offBadge}
        </Badge>
        {onToggle ? (
          <button
            type="button"
            aria-label={`${enabled ? text.turnOff : text.turnOn} ${title}`}
            aria-pressed={enabled}
            title={`${enabled ? text.turnOff : text.turnOn} ${title}`}
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(!enabled);
            }}
            style={systemToggleStyle(enabled, busy)}
          >
            <span style={systemToggleDotStyle(enabled)} />
          </button>
        ) : null}
      </div>
    </li>
  );
}

function SortablePageRow(props: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.page.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };
  return (
    <PageRow
      {...props}
      sortRef={setNodeRef}
      sortStyle={style}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

function PageRow({
  page,
  isActive,
  busy,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onSelect,
  onAction,
  onlyPage,
  text,
  sortRef,
  sortStyle,
  dragHandleProps,
}: RowProps & {
  sortRef?: (node: HTMLElement | null) => void;
  sortStyle?: React.CSSProperties;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(ev: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(ev.target as Node)) onMenuClose();
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen, onMenuClose]);

  const hasDraftChanges =
    page.publishedBlocks == null ||
    JSON.stringify(page.draftBlocks) !== JSON.stringify(page.publishedBlocks);

  return (
    <li
      ref={sortRef}
      style={{
        ...(sortStyle ?? {}),
        position: 'relative',
        listStyle: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          borderRadius: 6,
          border: `1px solid ${
            isActive ? 'var(--bld-accent-line)' : 'var(--bld-divider)'
          }`,
          background: isActive ? 'var(--bld-accent-soft)' : 'var(--bld-tile-bg)',
          transition: 'background 140ms, border-color 140ms',
        }}
      >
        {dragHandleProps ? (
          <button
            type="button"
            {...dragHandleProps}
            aria-label={text.dragToReorder}
            title={text.dragToReorder}
            style={{
              ...iconButtonStyle(),
              width: 18,
              height: 22,
              cursor: 'grab',
              color: 'var(--bld-text-muted)',
              border: 'none',
              background: 'transparent',
            }}
          >
            <svg
              width="10"
              height="14"
              viewBox="0 0 10 14"
              fill="currentColor"
              aria-hidden
            >
              <circle cx="2" cy="2" r="1" />
              <circle cx="2" cy="7" r="1" />
              <circle cx="2" cy="12" r="1" />
              <circle cx="8" cy="2" r="1" />
              <circle cx="8" cy="7" r="1" />
              <circle cx="8" cy="12" r="1" />
            </svg>
          </button>
        ) : (
          <span
            aria-hidden
            style={{
              width: 18,
              height: 22,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--bld-text-muted)',
            }}
            title={text.homePinned}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2 4 9v11h5v-6h6v6h5V9z" />
            </svg>
          </span>
        )}

        <button
          type="button"
          onClick={onSelect}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 2,
            padding: 0,
            background: 'transparent',
            border: 'none',
            color: 'var(--bld-text)',
            cursor: 'pointer',
            textAlign: 'start',
            minWidth: 0,
          }}
          aria-current={isActive ? 'page' : undefined}
          aria-label={`${text.edit} ${page.title}`}
        >
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 13,
              lineHeight: 1.2,
              fontWeight: isActive ? 600 : 500,
              color: 'var(--bld-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 180,
            }}
          >
            {page.title}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.06em',
              color: 'var(--bld-text-muted)',
            }}
          >
            <span style={{ opacity: 0.85 }}>/{page.slug}</span>
            <StatusDot
              status={page.status}
              hasDraftChanges={hasDraftChanges}
              text={text}
            />
            {page.isHome ? <Badge kind="home">{text.homeBadge}</Badge> : null}
            {page.showInNav ? <Badge kind="nav">{text.navBadge}</Badge> : null}
            {isActive ? <Badge kind="editing">{text.editingBadge}</Badge> : null}
          </span>
        </button>

        <button
          type="button"
          onClick={onMenuToggle}
          aria-label={text.pageActions}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={busy}
          style={{
            ...iconButtonStyle(),
            opacity: busy ? 0.4 : 1,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <circle cx="5" cy="12" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="19" cy="12" r="1.7" />
          </svg>
        </button>
      </div>

      {menuOpen ? (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'absolute',
            insetInlineEnd: 4,
            top: 'calc(100% + 4px)',
            zIndex: 30,
            minWidth: 180,
            padding: 4,
            background: 'var(--bld-surface)',
            border: '1px solid var(--bld-divider)',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.32)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <MenuItem onSelect={() => onAction('rename')}>{text.rename}</MenuItem>
          {!page.isHome ? (
            <MenuItem
              disabled={onlyPage}
              tooltip={
                onlyPage ? text.onlyPageExists : undefined
              }
              onSelect={() => onAction('set-home')}
            >
              {text.setAsHomepage}
            </MenuItem>
          ) : null}
          {!page.isHome ? (
            <MenuItem onSelect={() => onAction('toggle-nav')}>
              {page.showInNav ? text.hideFromNav : text.showInNav}
            </MenuItem>
          ) : null}
          <MenuItem onSelect={() => onAction('seo')}>{text.editSeo}</MenuItem>
          <MenuItem
            disabled={!hasDraftChanges}
            tooltip={
              !hasDraftChanges ? text.noDraftChanges : undefined
            }
            onSelect={() => onAction('publish')}
          >
            {text.publishPage}
          </MenuItem>
          {!page.isHome ? (
            <>
              <span
                style={{
                  height: 1,
                  background: 'var(--bld-divider)',
                  margin: '2px 0',
                }}
              />
              <MenuItem danger onSelect={() => onAction('delete')}>
                {text.deletePage}
              </MenuItem>
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function MenuItem({
  children,
  onSelect,
  disabled,
  danger,
  tooltip,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  tooltip?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) onSelect();
      }}
      role="menuitem"
      title={tooltip}
      disabled={disabled}
      style={{
        textAlign: 'start',
        padding: '7px 10px',
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        color: disabled
          ? 'var(--bld-text-faint)'
          : danger
            ? '#E68A8A'
            : 'var(--bld-text)',
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.background =
          'var(--bld-tile-bg)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function Badge({
  kind,
  children,
}: {
  kind: 'home' | 'nav' | 'editing' | 'disabled';
  children: React.ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    home: {
      color: 'var(--bld-accent)',
      borderColor: 'var(--bld-accent-line)',
      background: 'var(--bld-accent-soft)',
    },
    nav: {
      color: 'var(--bld-text)',
      borderColor: 'var(--bld-divider)',
      background: 'var(--bld-tile-bg)',
    },
    editing: {
      color: '#E8DCC4',
      borderColor: '#E8DCC477',
      background: 'rgba(232,220,196,0.08)',
    },
    disabled: {
      color: 'var(--bld-text-muted)',
      borderColor: 'var(--bld-divider)',
      background: 'transparent',
    },
  };
  return (
    <span
      style={{
        ...styles[kind],
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 3,
        padding: '0 4px',
        fontSize: 8,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

function StatusDot({
  status,
  hasDraftChanges,
  text,
}: {
  status: StorefrontPage['status'];
  hasDraftChanges: boolean;
  text: PageSwitcherText;
}) {
  // Three states:
  //   • published, no draft changes → solid green
  //   • published, has draft changes → amber dot ("draft ahead")
  //   • never published → grey dot ("draft only")
  const color =
    status === 'published' && !hasDraftChanges
      ? '#7FB069'
      : status === 'published'
        ? '#D9A24A'
        : 'var(--bld-text-faint)';
  const label =
    status === 'published' && !hasDraftChanges
      ? text.published
      : status === 'published'
        ? text.draftAhead
        : text.draftOnly;
  return (
    <span
      title={label}
      aria-label={label}
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
      }}
    />
  );
}

// ---- modals -------------------------------------------------------------

function PageFormModal({
  mode,
  slug,
  text,
  existingPages,
  page,
  onClose,
  onSuccess,
  onError,
}: {
  mode: 'create' | 'rename';
  slug: string;
  text: PageSwitcherText;
  existingPages: StorefrontPage[];
  page?: StorefrontPage;
  onClose: () => void;
  onSuccess: (pageSlug: string, message: string) => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState(page?.title ?? '');
  const [pageSlug, setPageSlug] = useState(page?.slug ?? '');
  // Whether the founder has hand-edited the slug. Until they do, every
  // keystroke in the title pane regenerates the slug from the title so
  // they don't have to think about URL safety.
  const [slugDirty, setSlugDirty] = useState(mode === 'rename');
  const [duplicateFromPageId, setDuplicateFromPageId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slugDirty) return;
    setPageSlug(normalizePageSlug(title));
  }, [slugDirty, title]);

  const isHome = page?.isHome === true;
  const slugLocked = mode === 'rename' && isHome;
  const reserved = !slugLocked && isReservedPageSlug(pageSlug || '');

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError(text.missingTitleError);
      return;
    }
    if (!slugLocked) {
      if (!pageSlug || !/^[a-z0-9-]+$/.test(pageSlug)) {
        setError(text.invalidSlugError);
        return;
      }
      if (reserved) {
        setError(text.reservedSlugError);
        return;
      }
    }
    setBusy(true);
    if (mode === 'create') {
      const res = await createStorefrontPage({
        slug,
        title: title.trim(),
        pageSlug,
        duplicateFromPageId: duplicateFromPageId || undefined,
      });
      setBusy(false);
      if (res.status === 'success' && 'page' in res) {
        onSuccess(res.page.slug, text.createdToast(res.page.title));
      } else if (res.status === 'error') {
        if (res.field) setError(res.message);
        else onError(res.message);
        if (!res.field) onClose();
      }
      return;
    }
    if (!page) return;
    const res = await renameStorefrontPage({
      slug,
      pageId: page.id,
      title: title.trim(),
      pageSlug: slugLocked ? undefined : pageSlug,
    });
    setBusy(false);
    if (res.status === 'success' && 'page' in res) {
      onSuccess(res.page.slug, text.renamedToast(res.page.title));
    } else if (res.status === 'error') {
      if (res.field) setError(res.message);
      else onError(res.message);
    }
  }

  return (
    <ModalShell
      onClose={onClose}
      ariaLabel={mode === 'create' ? text.addPageTitle : text.renamePageTitle}
    >
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ModalHeader title={mode === 'create' ? text.addPageTitle : text.renamePageTitle} />
        <Field label={text.titleLabel}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            placeholder={text.titlePlaceholder}
            style={inputStyle()}
          />
        </Field>
        <Field label={text.slugLabel} hint={slugLocked ? text.homeSlugHint : text.slugHint}>
          <input
            type="text"
            value={pageSlug}
            disabled={slugLocked}
            onChange={(e) => {
              setSlugDirty(true);
              setPageSlug(e.target.value.toLowerCase());
            }}
            onBlur={(e) =>
              setPageSlug(normalizePageSlug(e.target.value))
            }
            placeholder={text.slugPlaceholder}
            style={{
              ...inputStyle(),
              fontFamily: 'var(--font-mono)',
              opacity: slugLocked ? 0.6 : 1,
            }}
          />
        </Field>
        {mode === 'create' && existingPages.length > 0 ? (
          <Field
            label={text.duplicateFromLabel}
            hint={text.duplicateFromHint}
          >
            <select
              value={duplicateFromPageId}
              onChange={(e) => setDuplicateFromPageId(e.target.value)}
              style={inputStyle()}
            >
              <option value="">{text.blankPageOption}</option>
              {existingPages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} (/{p.slug})
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {error ? <ErrorLine>{error}</ErrorLine> : null}
        <ModalFooter
          busy={busy}
          onCancel={onClose}
          submitLabel={mode === 'create' ? text.addPageTitle : text.save}
          cancelLabel={text.cancel}
          workingLabel={text.working}
        />
      </form>
    </ModalShell>
  );
}

function PageSeoModal({
  slug,
  page,
  text,
  giphyStorefrontSlug,
  onClose,
  onSuccess,
  onError,
}: {
  slug: string;
  page: StorefrontPage;
  text: PageSwitcherText;
  giphyStorefrontSlug?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState(page.seo.title ?? '');
  const [description, setDescription] = useState(page.seo.description ?? '');
  const [image, setImage] = useState(page.seo.image ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setBusy(true);
    const res = await setStorefrontPageSeo({
      slug,
      pageId: page.id,
      seo: {
        title: title.trim() || null,
        description: description.trim() || null,
        image: image.trim() || null,
      },
    });
    setBusy(false);
    if (res.status === 'error') {
      if (res.field) setError(res.message);
      else onError(res.message);
      return;
    }
    onSuccess(text.seoUpdatedToast(page.title));
  }

  return (
    <ModalShell onClose={onClose} ariaLabel={text.editSeoAria(page.title)}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ModalHeader title={text.seoTitle(page.title)} />
        <Field label={text.titleLabel} hint={text.seoTitleHint}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={page.title}
            maxLength={140}
            style={inputStyle()}
          />
        </Field>
        <Field label={text.descriptionLabel} hint={text.seoDescriptionHint}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={260}
            style={{ ...inputStyle(), resize: 'vertical' }}
          />
        </Field>
        <Field label={text.openGraphImageLabel} hint={text.openGraphImageHint}>
          <MediaUploader
            value={image}
            onChange={setImage}
            namespace={`storefronts/${slug}/seo`}
            storefrontSlug={slug}
            giphyStorefrontSlug={giphyStorefrontSlug}
          />
        </Field>
        {error ? <ErrorLine>{error}</ErrorLine> : null}
        <ModalFooter
          busy={busy}
          onCancel={onClose}
          submitLabel={text.saveSeo}
          cancelLabel={text.cancel}
          workingLabel={text.working}
        />
      </form>
    </ModalShell>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  workingLabel,
  danger,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  workingLabel: string;
  danger?: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell onClose={onCancel} ariaLabel={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ModalHeader title={title} />
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--bld-text)',
          }}
        >
          {body}
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={secondaryButtonStyle()}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={
              danger
                ? { ...primaryButtonStyle(), background: '#A33A3A', borderColor: '#A33A3A' }
                : primaryButtonStyle()
            }
          >
            {busy ? workingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ---- shared primitives --------------------------------------------------

function ModalShell({
  children,
  onClose,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClose: () => void;
  ariaLabel: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bld-surface)',
          color: 'var(--bld-text)',
          border: '1px solid var(--bld-divider)',
          borderRadius: 8,
          padding: 18,
          width: 'min(440px, 100%)',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 18px 48px rgba(0,0,0,0.4)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title }: { title: string }) {
  return (
    <h2
      style={{
        margin: 0,
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 20,
        lineHeight: 1.2,
        color: 'var(--bld-text)',
      }}
    >
      {title}
    </h2>
  );
}

function ModalFooter({
  busy,
  onCancel,
  submitLabel,
  cancelLabel,
  workingLabel,
}: {
  busy: boolean;
  onCancel: () => void;
  submitLabel: string;
  cancelLabel: string;
  workingLabel: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 4,
      }}
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        style={secondaryButtonStyle()}
      >
        {cancelLabel}
      </button>
      <button type="submit" disabled={busy} style={primaryButtonStyle()}>
        {busy ? workingLabel : submitLabel}
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--bld-text-muted)',
        }}
      >
        {label}
      </span>
      {children}
      {hint ? (
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            color: 'var(--bld-text-muted)',
            fontStyle: 'italic',
          }}
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: '#E68A8A',
      }}
    >
      {children}
    </div>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 18,
        insetInlineStart: 18,
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents: 'auto',
            padding: '8px 12px',
            background: 'var(--bld-surface)',
            color: 'var(--bld-text)',
            border: `1px solid ${
              t.kind === 'err' ? '#E68A8A' : 'var(--bld-accent-line)'
            }`,
            borderRadius: 6,
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            boxShadow: '0 8px 22px rgba(0,0,0,0.32)',
            maxWidth: 320,
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ---- style helpers ------------------------------------------------------

function iconButtonStyle(): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: 'var(--bld-text-muted)',
    border: '1px solid var(--bld-divider)',
    borderRadius: 5,
    cursor: 'pointer',
    flex: '0 0 auto',
  };
}

function systemToggleStyle(enabled: boolean, busy: boolean): React.CSSProperties {
  return {
    width: 34,
    height: 20,
    borderRadius: 999,
    border: `1px solid ${enabled ? 'var(--bld-accent-line)' : 'var(--bld-divider)'}`,
    background: enabled ? 'var(--bld-accent)' : 'var(--bld-input-bg)',
    padding: 2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: enabled ? 'flex-end' : 'flex-start',
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.62 : 1,
    flex: '0 0 auto',
    transition: 'background 140ms ease, border-color 140ms ease, opacity 140ms ease',
  };
}

function systemToggleDotStyle(enabled: boolean): React.CSSProperties {
  return {
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: enabled ? 'var(--bld-surface)' : 'var(--bld-text-muted)',
    boxShadow: enabled ? '0 4px 10px rgba(0,0,0,0.18)' : undefined,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--bld-input-bg)',
    color: 'var(--bld-input-text)',
    border: '1px solid var(--bld-input-border)',
    borderRadius: 5,
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    outline: 'none',
  };
}

function primaryButtonStyle(): React.CSSProperties {
  return {
    padding: '7px 14px',
    border: '1px solid var(--bld-accent-line)',
    borderRadius: 999,
    background: 'var(--bld-accent)',
    color: 'var(--bld-accent-ink)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  };
}

function secondaryButtonStyle(): React.CSSProperties {
  return {
    padding: '7px 14px',
    border: '1px solid var(--bld-input-border)',
    borderRadius: 5,
    background: 'transparent',
    color: 'var(--bld-input-text)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  };
}

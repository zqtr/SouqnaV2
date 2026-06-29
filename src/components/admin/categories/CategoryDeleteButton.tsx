'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/admin/Modal';
import { deleteCategory } from '@/app/actions/categories';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

/**
 * Two-step delete affordance for a category. Opens a small confirm
 * modal so the founder doesn't lose work to an accidental click. The
 * server cascade unlinks every product in the category, but the
 * products themselves are not deleted.
 */
export function CategoryDeleteButton({
  storefrontSlug,
  categoryId,
  categoryName,
  productCount,
}: {
  storefrontSlug: string;
  categoryId: string;
  categoryName: string;
  productCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory({
        storefrontSlug,
        id: categoryId,
      });
      if (result.status === 'error') {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="h-8 rounded-md border-[color:var(--surface-rule-strong)] bg-[color:var(--surface-bg)] px-3 text-[color:var(--color-maroon,#8b3a3a)] hover:bg-[color:color-mix(in_srgb,var(--color-maroon,#8b3a3a)_8%,transparent)] hover:text-[color:var(--color-maroon,#8b3a3a)]"
      >
        <Trash2 data-icon="inline-start" />
        Remove
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete “${categoryName}”?`}
        subtitle={
          productCount === 0
            ? 'No products are linked to this category.'
            : `${productCount} product${productCount === 1 ? '' : 's'} will be unlinked. The products themselves stay in your catalogue.`
        }
        size="sm"
        dismissOnBackdrop={false}
        footer={
          <>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              variant="outline"
              className="rounded-md border-[color:var(--surface-rule-strong)] bg-[color:var(--surface-bg)] text-[color:var(--ink-strong)] hover:bg-[color:var(--surface-elevated)]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="rounded-md bg-[color:var(--color-maroon,#8b3a3a)] text-white hover:bg-[color:color-mix(in_srgb,var(--color-maroon,#8b3a3a)_88%,black)]"
            >
              {pending ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
              {pending ? 'Removing...' : 'Remove category'}
            </Button>
          </>
        }
      >
        {error ? (
          <p
            role="alert"
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: '#f1b1a1',
              letterSpacing: '0.03em',
            }}
          >
            {error}
          </p>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--ink-muted)',
              lineHeight: 1.55,
            }}
          >
            This action can&rsquo;t be undone.
          </p>
        )}
      </Modal>
    </>
  );
}

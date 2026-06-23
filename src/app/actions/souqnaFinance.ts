'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertSouqnaOperator } from '@/lib/souqna-operator';
import { markCheckoutPayoutPaid } from '@/lib/platformPayouts';

const IdSchema = z.string().uuid();

export async function markSouqnaPayoutPaid(payoutId: string) {
  const parsed = IdSchema.safeParse(payoutId);
  if (!parsed.success) return { status: 'error' as const, message: 'Invalid payout.' };
  const operator = await assertSouqnaOperator();
  const ok = await markCheckoutPayoutPaid(parsed.data, operator.userId);
  revalidatePath('/account/souqna');
  return ok
    ? { status: 'success' as const }
    : { status: 'error' as const, message: 'Payout not found.' };
}

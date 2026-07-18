'use client';

import { useEffect, useRef, useState, type Dispatch, type FormEvent } from 'react';
import { parseImportAnswer } from '@/app/actions/instagramImport';
import type { ReviewQuestion } from '@/lib/instagram/questions';
import type { DraftProduct } from '@/lib/instagram/types';
import type { Locale } from '@/i18n/locales';
import type { ChatMessage, ImportAction, ImportState } from './importMachine';
import type { ImportCopy } from './copy';
import { ProductDraftCard } from './ProductDraftCard';

/**
 * The review conversation: the assistant walks product by product
 * through the gaps the analysis left. Questions are deterministic
 * (`buildReviewQuestions`); chips resolve locally with zero server
 * calls, free-text answers go through `parseImportAnswer` (regex-first
 * for prices, cheap text model otherwise). Works identically with AI
 * offline — only free-text parsing degrades.
 */
export function ImportChat({
  state,
  dispatch,
  copy,
  locale,
  isRtl,
}: {
  state: ImportState;
  dispatch: Dispatch<ImportAction>;
  copy: ImportCopy;
  locale: Locale;
  isRtl: boolean;
}) {
  const [freeText, setFreeText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const inChat = state.phase === 'chat';
  const question = inChat ? state.questions[state.questionIndex] : undefined;
  const questionDraft = question
    ? state.drafts.find((draft) => draft.postId === question.postId)
    : undefined;
  const productCount = state.drafts.filter((draft) => draft.isProduct).length;

  // Intro bubble once, then one bubble per question as it becomes
  // current. push-message dedupes by id, so re-renders are harmless.
  useEffect(() => {
    if (!inChat) return;
    dispatch({
      type: 'push-message',
      message: {
        id: 'intro',
        role: 'assistant',
        text: state.aiAvailable
          ? copy.chatIntro(productCount)
          : `${copy.aiOffNote} ${copy.chatIntro(productCount)}`,
      },
    });
  }, [inChat, dispatch, copy, productCount, state.aiAvailable]);

  useEffect(() => {
    if (!question) return;
    dispatch({
      type: 'push-message',
      message: {
        id: question.id,
        role: 'assistant',
        text: questionText(question, copy),
        postId: question.postId,
        kind: question.kind,
      },
    });
  }, [question, dispatch, copy]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.messages.length, state.phase]);

  function answerWithPatch(q: ReviewQuestion, patch: Partial<DraftProduct>, label: string) {
    dispatch({ type: 'push-message', message: userMessage(q, label) });
    dispatch({ type: 'apply-patch', postId: q.postId, patch });
    dispatch({ type: 'advance-question' });
  }

  function skipQuestion(q: ReviewQuestion, label: string) {
    dispatch({ type: 'push-message', message: userMessage(q, label) });
    if (q.kind === 'is_product') {
      // Skipping the "is this a product?" question keeps it in.
      dispatch({ type: 'apply-patch', postId: q.postId, patch: { isProduct: true } });
    }
    dispatch({ type: 'advance-question' });
  }

  async function submitFreeText(event: FormEvent) {
    event.preventDefault();
    const q = question;
    const draft = questionDraft;
    const text = freeText.trim();
    if (!q || !draft || !text || isParsing) return;
    setFreeText('');
    dispatch({ type: 'push-message', message: userMessage(q, text) });
    setIsParsing(true);
    try {
      const result = await parseImportAnswer({
        locale,
        questionKind: q.kind,
        answerText: text,
        draft: {
          titleEn: draft.titleEn,
          titleAr: draft.titleAr,
          priceQar: draft.priceQar,
          category: draft.category,
        },
      });
      if (result.status === 'ok' && Object.keys(result.patch).length > 0) {
        dispatch({ type: 'apply-patch', postId: q.postId, patch: result.patch });
        dispatch({ type: 'advance-question' });
      } else if (result.status === 'error') {
        dispatch({ type: 'push-message', message: assistantNote(q, result.message) });
      } else {
        dispatch({ type: 'push-message', message: assistantNote(q, copy.unparsed) });
      }
    } catch {
      dispatch({ type: 'push-message', message: assistantNote(q, copy.unparsed) });
    } finally {
      setIsParsing(false);
    }
  }

  const answeredProducts = question
    ? state.drafts.filter((d) => d.isProduct).findIndex((d) => d.postId === question.postId) + 1
    : productCount;

  return (
    <div className="ig-chat" dir={isRtl ? 'rtl' : 'ltr'}>
      {question ? (
        <div className="ig-chat-progress">
          {copy.productOf(Math.max(answeredProducts, 1), Math.max(productCount, 1))}
        </div>
      ) : null}

      <div className="ig-thread" ref={threadRef} aria-live="polite">
        {state.messages.map((message) => {
          const card =
            message.role === 'assistant' && message.postId
              ? state.drafts.find((draft) => draft.postId === message.postId)
              : undefined;
          const showCard = card && firstMessageForPost(state.messages, message);
          return (
            <div key={message.id} className={`ig-msg is-${message.role}`}>
              {showCard ? (
                <ProductDraftCard draft={card} copy={copy} locale={locale} isRtl={isRtl} />
              ) : null}
              <p className="ig-bubble">{message.text}</p>
            </div>
          );
        })}
      </div>

      {question ? (
        <div className="ig-chat-controls">
          <div className="ig-chips">
            {question.kind === 'is_product' ? (
              <>
                <button
                  type="button"
                  className="ig-chip is-primary"
                  onClick={() => answerWithPatch(question, { isProduct: true }, copy.chipYesSell)}
                >
                  {copy.chipYesSell}
                </button>
                <button
                  type="button"
                  className="ig-chip"
                  onClick={() => answerWithPatch(question, { isProduct: false }, copy.chipNotProduct)}
                >
                  {copy.chipNotProduct}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="ig-chip"
                  onClick={() =>
                    skipQuestion(
                      question,
                      question.kind === 'price' ? copy.chipSkipPrice : copy.chipSkipQuestion,
                    )
                  }
                >
                  {question.kind === 'price' ? copy.chipSkipPrice : copy.chipSkipQuestion}
                </button>
                <button
                  type="button"
                  className="ig-chip"
                  onClick={() => dispatch({ type: 'skip-product', postId: question.postId })}
                >
                  {copy.skipProduct}
                </button>
              </>
            )}
            <button type="button" className="ig-chip is-quiet" onClick={() => dispatch({ type: 'accept-all' })}>
              {copy.acceptAll}
            </button>
          </div>

          {question.allowFreeText ? (
            <form className="ig-answer" onSubmit={(event) => void submitFreeText(event)}>
              <input
                value={freeText}
                onChange={(event) => setFreeText(event.target.value)}
                placeholder={copy.freeTextPlaceholder}
                dir={isRtl ? 'rtl' : 'ltr'}
                disabled={isParsing}
              />
              <button type="submit" disabled={isParsing || freeText.trim().length === 0}>
                {copy.send}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function questionText(question: ReviewQuestion, copy: ImportCopy): string {
  if (question.kind === 'is_product') return copy.qIsProduct;
  if (question.kind === 'price') return question.dmForPrice ? copy.qPriceDm : copy.qPrice;
  if (question.kind === 'title') return copy.qTitle;
  return copy.qCategory;
}

function userMessage(question: ReviewQuestion, text: string): ChatMessage {
  return { id: `${question.id}:answer:${Date.now()}`, role: 'user', text };
}

function assistantNote(question: ReviewQuestion, text: string): ChatMessage {
  return { id: `${question.id}:note:${Date.now()}`, role: 'assistant', text };
}

/** Show the draft card only above the first bubble that concerns a post. */
function firstMessageForPost(messages: ChatMessage[], message: ChatMessage): boolean {
  const first = messages.find((m) => m.postId === message.postId && m.role === 'assistant');
  return first?.id === message.id;
}

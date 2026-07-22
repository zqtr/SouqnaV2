import { describe, expect, it } from 'vitest';
import { parseSouqyOutput, SOUQY_FEW_SHOTS } from '@/lib/souqy/prompt';
import { normalizeSouqyOutput } from '@/lib/souqy/normalize';
import { validateSouqyOutput } from '@/lib/souqy/validate';
import { scopeSouqyCss } from '@/lib/souqy/css';

/**
 * The few-shots are hand-maintained examples the model is told to imitate.
 * If one of them fails our own parse → normalize → validate pipeline, every
 * generation starts from a broken example — pin them green.
 */
describe('SOUQY_FEW_SHOTS', () => {
  const assistantTurns = SOUQY_FEW_SHOTS.filter((turn) => turn.role === 'assistant');

  it('ships at least two assistant examples', () => {
    expect(assistantTurns.length).toBeGreaterThanOrEqual(2);
  });

  for (const [index, turn] of assistantTurns.entries()) {
    it(`example ${index + 1} passes parse → normalize → validate`, () => {
      const output = normalizeSouqyOutput(parseSouqyOutput(turn.content));
      expect(validateSouqyOutput(output.files)).toEqual({ ok: true });
    });
  }

  it('at least one example demonstrates the Custom + styles.css surface', () => {
    const withCss = assistantTurns
      .map((turn) => parseSouqyOutput(turn.content))
      .filter((output) => output.files['styles.css']);
    expect(withCss.length).toBeGreaterThanOrEqual(1);
    for (const output of withCss) {
      expect(output.files['index.tsx']).toContain('<Custom');
      // The example CSS must scope cleanly — it is the model's blueprint.
      expect(() => scopeSouqyCss(output.files['styles.css']!)).not.toThrow();
    }
  });
});

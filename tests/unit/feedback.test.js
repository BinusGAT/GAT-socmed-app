import { describe, expect, it } from 'vitest';
import { normalizeFeedbackMessage } from '../../utils/feedback';

describe('normalizeFeedbackMessage', () => {
  it('removes decorative emoji, exclamation marks, and redundant success wording', () => {
    expect(normalizeFeedbackMessage('💾 Settings updated successfully!', 'success'))
      .toBe('Settings updated.');
  });

  it('does not expose raw exception details in error feedback', () => {
    expect(normalizeFeedbackMessage('❌ Export failed: database token abc123', 'error'))
      .toBe('Export failed. Try again.');
  });

  it('preserves actionable validation messages', () => {
    expect(normalizeFeedbackMessage('Please fill in PIC and Category.', 'error'))
      .toBe('Please fill in PIC and Category.');
  });
});

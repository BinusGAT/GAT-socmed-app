import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PlatformBadge from '../../components/PlatformBadge.jsx';

describe('PlatformBadge', () => {
  it('renders malicious platform input as inert text', () => {
    const malicious = '<img src=x onerror="globalThis.pwned=true">';
    const html = renderToStaticMarkup(<PlatformBadge platform={malicious} />);

    expect(html).not.toContain('<img');
    expect(html).not.toContain('dangerouslySetInnerHTML');
    expect(html).toContain('&lt;img');
  });
});

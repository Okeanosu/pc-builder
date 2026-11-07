// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

afterEach(cleanup);

const caret = (root: HTMLElement) => root.querySelector('span.animate-caret');

describe('Markdown', () => {
  it('renders GFM and no caret when not streaming', () => {
    const { container } = render(<Markdown text={'**Cân bằng**: 22.480.000₫\n\n- CPU\n- GPU'} />);
    expect(container.querySelector('strong')?.textContent).toBe('Cân bằng');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(caret(container)).toBeNull();
  });

  it('puts the caret at the end of the last paragraph while streaming', () => {
    const { container } = render(<Markdown text={'Đoạn một.\n\nĐoạn **hai** đang viết'} streaming />);
    const c = caret(container);
    expect(c?.parentElement?.tagName).toBe('P');
    expect(c?.parentElement?.textContent).toBe('Đoạn hai đang viết');
    expect(c?.nextSibling).toBeNull();
  });

  it('follows a list into its last item', () => {
    const { container } = render(<Markdown text={'- một\n- hai'} streaming />);
    expect(caret(container)?.parentElement?.textContent).toBe('hai');
  });

  it('drops raw HTML and images', () => {
    const { container } = render(<Markdown text={'<script>x</script> ![a](http://x/y.png) chữ'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});

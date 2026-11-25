import type { ComponentPropsWithoutRef } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/cn';

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const CARET_HOSTS = new Set([
  'p',
  'li',
  'ul',
  'ol',
  'blockquote',
  'strong',
  'em',
  'a',
  'h1',
  'h2',
  'h3',
  'td',
  'tr',
  'tbody',
  'table',
]);

/** Puts the streaming caret inside the deepest last text block, so it trails the final word. */
function rehypeCaret() {
  return (tree: HastNode) => {
    let target = tree;
    while (target.children && target.children.length > 0) {
      const last = [...target.children].reverse().find((c) => c.type !== 'text' || Boolean(c.value?.trim()));
      if (last?.type !== 'element' || !CARET_HOSTS.has(last.tagName ?? '')) break;
      target = last;
    }
    target.children ??= [];
    target.children.push({ type: 'element', tagName: 'span', properties: { dataCaret: '' }, children: [] });
  };
}

function Caret() {
  return (
    <span
      aria-hidden
      className="ms-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] animate-caret bg-accent"
    />
  );
}

const components: Components = {
  span: ({ node: _n, ...props }) =>
    'data-caret' in props ? <Caret /> : <span {...(props as ComponentPropsWithoutRef<'span'>)} />,
  h1: ({ node: _n, ...props }) => <p className="font-semibold text-fg" {...props} />,
  h2: ({ node: _n, ...props }) => <p className="font-semibold text-fg" {...props} />,
  h3: ({ node: _n, ...props }) => <p className="font-semibold text-fg" {...props} />,
  ul: ({ node: _n, ...props }) => (
    <ul className="flex list-disc flex-col gap-1 ps-5 marker:text-muted" {...props} />
  ),
  ol: ({ node: _n, ...props }) => (
    <ol className="flex list-decimal flex-col gap-1 ps-5 marker:text-muted marker:tabular-nums" {...props} />
  ),
  strong: ({ node: _n, ...props }) => <strong className="font-semibold text-fg" {...props} />,
  a: ({ node: _n, href, ...props }) => (
    <a
      href={href}
      className="focus-ring rounded-xs text-fg underline decoration-border-strong underline-offset-4 hover:decoration-current"
      {...(href?.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      {...props}
    />
  ),
  code: ({ node: _n, ...props }) => (
    <code className="rounded-xs bg-surface-2 px-1 py-0.5 font-mono text-[0.9em]" {...props} />
  ),
  blockquote: ({ node: _n, ...props }) => (
    <blockquote className="border-s-2 border-border-strong ps-3 text-muted" {...props} />
  ),
  table: ({ node: _n, ...props }) => (
    <div className="no-scrollbar overflow-x-auto rounded-sm border border-border">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: ({ node: _n, ...props }) => (
    <th className="border-b border-border bg-surface-2 px-3 py-1.5 text-start font-semibold" {...props} />
  ),
  td: ({ node: _n, ...props }) => (
    <td className="border-b border-border px-3 py-1.5 align-top tabular-nums" {...props} />
  ),
};

/** Assistant text as GFM markdown (no raw HTML, no images); `streaming` adds the blinking caret. */
export function Markdown({
  text,
  streaming,
  className,
}: {
  text: string;
  streaming?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 text-base leading-7 text-fg [overflow-wrap:anywhere]',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={streaming ? [rehypeCaret] : []}
        components={components}
        disallowedElements={['img']}
        unwrapDisallowed
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

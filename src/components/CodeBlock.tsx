import { useState, useEffect, useMemo } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { getHighlighter, Highlighter } from 'shiki';
import { Toaster, toast } from 'sonner';
import { Skeleton } from './ui/skeleton';
let highlighter: Highlighter | null = null;
interface CodeBlockProps {
  code: string;
  language: string;
}
export function CodeBlock({ code, language }: CodeBlockProps) {
  const [highlightedHtml, setHighlightedHtml] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const { isDark } = useTheme();
  useEffect(() => {
    let isMounted = true;
    const highlightCode = async () => {
      if (!highlighter) {
        try {
          highlighter = await getHighlighter({
            themes: ['github-light', 'github-dark'],
            langs: ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'bash', 'markdown', 'tsx', 'jsx', 'go', 'rust'],
          });
        } catch (error) {
          console.error("Shiki highlighter initialization failed:", error);
          if (isMounted) {
            setHighlightedHtml(`<pre class="shiki-fallback"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
          }
          return;
        }
      }
      try {
        const theme = isDark ? 'github-dark' : 'github-light';
        const html = highlighter.codeToHtml(code, {
          lang: language,
          theme: theme,
        });
        if (isMounted) {
          setHighlightedHtml(html);
        }
      } catch (error) {
        console.error(`Shiki highlighting failed for lang ${language}:`, error);
        if (isMounted) {
          setHighlightedHtml(`<pre class="shiki-fallback"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
        }
      }
    };
    highlightCode();
    return () => {
      isMounted = false;
    };
  }, [code, language, isDark]);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      toast.success('Copied to clipboard!');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };
  const lines = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(highlightedHtml, 'text/html');
    const codeEl = doc.querySelector('code');
    if (!codeEl) return [];
    const lineElements = Array.from(codeEl.children);
    if (lineElements.length > 0 && lineElements[0].tagName === 'SPAN') {
        return lineElements.map(line => line.outerHTML);
    }
    // Fallback for single-line or non-standard output
    return codeEl.innerHTML.split('\n').map(line => `<span>${line}</span>`);
  }, [highlightedHtml]);
  return (
    <div className="relative my-4 rounded-lg bg-secondary text-secondary-foreground font-mono text-sm group border shadow-sm max-h-[400px] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="text-xs text-muted-foreground">{language}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
        >
          {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      <div className="overflow-auto p-4 flex-1">
        {highlightedHtml ? (
          <pre className="!bg-transparent !p-0 m-0">
            <code className="grid">
              {lines.map((line, index) => (
                <div key={index} className="flex">
                  <span className="text-right select-none text-muted-foreground/50 w-8 pr-4">{index + 1}</span>
                  <span className="flex-1" dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
                </div>
              ))}
            </code>
          </pre>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}
      </div>
      <Toaster richColors position="top-center" />
    </div>
  );
}
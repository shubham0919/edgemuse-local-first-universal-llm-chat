import { useState, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { getHighlighter, setCDN } from 'shiki';
import { Toaster, toast } from 'sonner';
// Use a CDN for shiki assets
setCDN('https://unpkg.com/shiki/');
interface CodeBlockProps {
  code: string;
  language: string;
}
export function CodeBlock({ code, language }: CodeBlockProps) {
  const [highlightedCode, setHighlightedCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const { isDark } = useTheme();
  useEffect(() => {
    let isMounted = true;
    const highlight = async () => {
      try {
        const highlighter = await getHighlighter({
          themes: ['github-light', 'github-dark'],
          langs: ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'bash', 'markdown'],
        });
        const html = highlighter.codeToHtml(code, {
          lang: language,
          theme: isDark ? 'github-dark' : 'github-light',
        });
        if (isMounted) {
          setHighlightedCode(html);
        }
      } catch (error) {
        console.error("Shiki highlighting failed:", error);
        if (isMounted) {
          // Fallback to plain text
          setHighlightedCode(`<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
        }
      }
    };
    highlight();
    return () => { isMounted = false; };
  }, [code, language, isDark]);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      toast.success('Copied to clipboard!');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };
  return (
    <div className="relative my-4 rounded-lg shadow-md bg-secondary text-secondary-foreground font-mono text-sm group">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        onClick={handleCopy}
      >
        {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </Button>
      <div
        className="overflow-x-auto p-4 rounded-lg [&>pre]:bg-transparent [&>pre]:p-0 [&>pre]:rounded-none"
        dangerouslySetInnerHTML={{ __html: highlightedCode || '<pre><code></code></pre>' }}
      />
      <Toaster richColors />
    </div>
  );
}
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Renders task/project prose as Markdown, GitHub-flavoured (tables, task lists,
 * strikethrough, bare URLs autolinked).
 *
 * Deliberately no rehype-raw: react-markdown ignores embedded HTML by default,
 * and descriptions are written by other project members. Turning raw HTML on
 * would make any member's description a stored-XSS vector for the whole team.
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={`dk-prose${className ? ` ${className}` : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: label }) => (
            <a
              href={href}
              // Untrusted destinations: noopener stops window.opener access,
              // noreferrer keeps the board's URL out of the target's logs.
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              {label}
            </a>
          ),
          img: ({ src, alt }) => (
            <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

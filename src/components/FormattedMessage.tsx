import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface FormattedMessageProps {
    content: string;
    className?: string;
}

export function FormattedMessage({ content, className = "" }: FormattedMessageProps) {
    return (
        <div className={`formatted-message ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Headings with gradient colors
                    h1: ({ children }) => (
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-3 mt-4">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-xl font-semibold text-primary mb-2 mt-3 border-b border-primary/20 pb-1">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-lg font-medium text-blue-400 mb-2 mt-2">
                            {children}
                        </h3>
                    ),
                    // Paragraphs
                    p: ({ children }) => (
                        <p className="mb-3 leading-relaxed text-foreground/90">{children}</p>
                    ),
                    // Lists with colorful bullets
                    ul: ({ children }) => (
                        <ul className="mb-3 ml-4 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="mb-3 ml-4 space-y-1 list-decimal">{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li className="relative pl-5 before:content-['▸'] before:absolute before:left-0 before:text-primary before:font-bold">
                            {children}
                        </li>
                    ),
                    // Code blocks with syntax highlighting
                    code: ({ className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || "");
                        const isInline = !match && !className;

                        if (isInline) {
                            return (
                                <code className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono text-sm" {...props}>
                                    {children}
                                </code>
                            );
                        }

                        return (
                            <SyntaxHighlighter
                                style={oneDark}
                                language={match?.[1] || "text"}
                                PreTag="div"
                                className="rounded-lg my-3 text-sm"
                                customStyle={{
                                    margin: 0,
                                    borderRadius: "0.5rem",
                                    padding: "1rem",
                                }}
                            >
                                {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                        );
                    },
                    // Blockquotes with accent styling
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-3 bg-primary/5 rounded-r-lg italic text-muted-foreground">
                            {children}
                        </blockquote>
                    ),
                    // Strong/bold with accent color
                    strong: ({ children }) => (
                        <strong className="font-semibold text-primary">{children}</strong>
                    ),
                    // Emphasis/italic
                    em: ({ children }) => (
                        <em className="italic text-purple-400">{children}</em>
                    ),
                    // Links
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline decoration-dotted underline-offset-2 transition-colors"
                        >
                            {children}
                        </a>
                    ),
                    // Tables
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-3">
                            <table className="min-w-full border-collapse rounded-lg overflow-hidden">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-primary/20">{children}</thead>
                    ),
                    th: ({ children }) => (
                        <th className="px-4 py-2 text-left font-semibold text-primary border-b border-primary/30">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="px-4 py-2 border-b border-border/50">{children}</td>
                    ),
                    // Horizontal rule
                    hr: () => (
                        <hr className="my-4 border-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "./activity-description.css";

// Preserve editor formatting while retaining the sanitizer's safe URL and
// attribute rules (scripts, event handlers, and unsafe links remain blocked).
const descriptionSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "u", "s"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "style", "className"],
  },
};

export function ActivityDescription({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={`activity-description ${className}`}>
      <ReactMarkdown rehypePlugins={[rehypeRaw, [rehypeSanitize, descriptionSchema]]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

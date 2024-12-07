import { useEffect } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-css";
import "prismjs/components/prism-go";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-markup";
// Add Go language support
import "prismjs/themes/prism-tomorrow.css";

// Dark theme

const CodeBlock = ({ code, language = "javascript" }: { code: string; language: string }) => {
  useEffect(() => {
    Prism.highlightAll();
  }, [code]);

  return (
    <pre className="rounded-lg">
      <code className={`language-${language}`}>{code}</code>
    </pre>
  );
};

export default CodeBlock;

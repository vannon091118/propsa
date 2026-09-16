import React from 'react';
/**
 * Simple markdown to HTML converter for basic changelog formatting.
 * Supports headings, bold, italic, lists, links, horizontal rules, and paragraphs.
 */
export declare function markdownToHtml(markdown: string): string;
interface MarkdownRendererProps {
    markdown: string;
}
export declare const MarkdownRenderer: React.FC<MarkdownRendererProps>;
export {};

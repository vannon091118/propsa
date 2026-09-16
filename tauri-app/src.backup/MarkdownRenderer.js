"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownRenderer = void 0;
exports.markdownToHtml = markdownToHtml;
const react_1 = __importDefault(require("react"));
/**
 * Simple markdown to HTML converter for basic changelog formatting.
 * Supports headings, bold, italic, lists, links, horizontal rules, and paragraphs.
 */
function markdownToHtml(markdown) {
    if (!markdown)
        return '';
    // Normalize line endings
    let text = markdown.replace(/\r\n/g, '\n');
    // Escape HTML special chars
    const escapeHtml = (str) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    // Process line by line
    const lines = text.split('\n');
    let i = 0;
    const htmlParts = [];
    while (i < lines.length) {
        const line = lines[i];
        // Horizontal rule
        if (/^[-*_]{3,}\s*$/.test(line)) {
            htmlParts.push('<hr>');
            i++;
            continue;
        }
        // Heading
        const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const content = headingMatch[2];
            htmlParts.push(`<h${level}>${escapeInline(content)}</h${level}>`);
            i++;
            continue;
        }
        // List items (unordered or ordered)
        if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
            // Determine list type
            const isOrdered = /^\s*\d+\./.test(line);
            const listType = isOrdered ? 'ol' : 'ul';
            const listItems = [];
            while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
                const itemLine = lines[i];
                const itemContent = itemLine.replace(/^\s*([-*]|\d+\.)\s+/, '');
                listItems.push(`<li>${escapeInline(itemContent)}</li>`);
                i++;
            }
            htmlParts.push(`<${listType}>${listItems.join('')}</${listType}>`);
            continue;
        }
        // Empty line -> paragraph break
        if (line.trim() === '') {
            htmlParts.push(''); // will be handled as paragraph separator
            i++;
            continue;
        }
        // Paragraph: collect consecutive non-empty, non-list, non-heading lines
        const paragraphLines = [];
        while (i < lines.length) {
            const cur = lines[i];
            if (cur.trim() === '' ||
                /^[-*_]{3,}\s*$/.test(cur) ||
                /^(#{1,6})\s+/.test(cur) ||
                /^\s*([-*]|\d+\.)\s+/.test(cur)) {
                break;
            }
            paragraphLines.push(cur);
            i++;
        }
        if (paragraphLines.length > 0) {
            const paragraph = paragraphLines.join(' ');
            htmlParts.push(`<p>${escapeInline(paragraph)}</p>`);
        }
    }
    // Join parts, wrapping consecutive non-tag lines? We already wrapped.
    return htmlParts.join('\n');
}
/**
 * Escape HTML and also handle inline markdown: bold, italic, links, code.
 */
function escapeInline(text) {
    // Escape HTML first
    let result = escapeHtml(text);
    // Handle links: [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, url) => `<a href="${escapeHtml(url)}">${escapeHtml(linkText)}</a>`);
    // Handle bold: **text** or __text__
    result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__(.*?)__/g, '<strong>$1</strong>');
    // Handle italic: *text* or _text_ (but not interfering with bold)
    result = result.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    result = result.replace(/(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)/g, '<em>$1</em>');
    // Handle inline code: `text`
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
    return result;
}
const MarkdownRenderer = ({ markdown }) => {
    const html = react_1.default.useMemo(() => markdownToHtml(markdown), [markdown]);
    return <div dangerouslySetInnerHTML={{ __html: html }} className="markdown-body"/>;
};
exports.MarkdownRenderer = MarkdownRenderer;

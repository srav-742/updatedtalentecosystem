import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
    Clock, ArrowLeft, Calendar, Share2, Linkedin, Twitter, 
    Copy, BookOpen, Loader2, ArrowRight, Sparkles,
    Info, AlertTriangle, Check, User, Sun, Moon
} from 'lucide-react';
import { getBlogPostBySlug, getRelatedPosts } from '../../services/blogService';
import { useBlogTheme } from './BlogThemeContext';

// ==========================================
// CUSTOM MARKDOWN RENDERING SYSTEM
// ==========================================

// Parse inline markdown elements (bold, italic, links, inline code)
const parseInline = (text, isDark) => {
    if (!text) return [];
    
    const parse = (str) => {
        if (!str) return [];
        
        const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
        const boldRegex = /\*\*([^*]+)\*\*/;
        const italicRegex = /\*([^*]+)\*/;
        const codeRegex = /`([^`]+)`/;

        let matches = [];
        
        const imgMatch = str.match(imgRegex);
        if (imgMatch) matches.push({ type: 'image', match: imgMatch });
        
        const linkMatch = str.match(linkRegex);
        if (linkMatch) matches.push({ type: 'link', match: linkMatch });
        
        const boldMatch = str.match(boldRegex);
        if (boldMatch) matches.push({ type: 'bold', match: boldMatch });
        
        const italicMatch = str.match(italicRegex);
        if (italicMatch) matches.push({ type: 'italic', match: italicMatch });
        
        const codeMatch = str.match(codeRegex);
        if (codeMatch) matches.push({ type: 'code', match: codeMatch });

        if (matches.length === 0) {
            return [str];
        }

        // Find earliest match
        matches.sort((a, b) => a.match.index - b.match.index);
        const earliest = matches[0];
        const { index } = earliest.match;
        const matchedStr = earliest.match[0];
        
        const prefix = str.substring(0, index);
        const suffix = str.substring(index + matchedStr.length);
        
        let element = null;
        if (earliest.type === 'image') {
            const [, alt, src] = earliest.match;
            element = (
                <span className="block my-10 select-none" key={index}>
                    <img src={src} alt={alt} loading="lazy" decoding="async" crossOrigin="anonymous" referrerPolicy="no-referrer" style={{ borderRadius: '1rem', border: `1px solid ${isDark ? '#232b40' : '#E3E5EC'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', height: 'auto', margin: '0 auto', display: 'block' }} />
                </span>
            );
        } else if (earliest.type === 'link') {
            const [, text, href] = earliest.match;
            const isExternal = href.startsWith('http') || href.startsWith('//');
            element = (
                <a 
                    href={href} 
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    style={{ color: isDark ? '#E6BC6B' : '#C99A45', fontWeight: 600, textDecoration: 'underline', transition: 'color 0.2s' }}
                    key={index}
                >
                    {parse(text)}
                </a>
            );
        } else if (earliest.type === 'bold') {
            const [, text] = earliest.match;
            element = <strong style={{ fontWeight: 700, color: isDark ? '#F8FAFC' : '#20263A' }} key={index}>{parse(text)}</strong>;
        } else if (earliest.type === 'italic') {
            const [, text] = earliest.match;
            element = <em style={{ fontStyle: 'italic', color: isDark ? '#CBD5E1' : '#5E6577' }} key={index}>{parse(text)}</em>;
        } else if (earliest.type === 'code') {
            const [, code] = earliest.match;
            element = (
                <code style={{ background: isDark ? '#1E2535' : '#F4EBDD', fontFamily: 'monospace', fontSize: '14px', padding: '2px 6px', borderRadius: '4px', color: isDark ? '#E6BC6B' : '#8C6B28', border: `1px solid ${isDark ? '#2A3348' : '#E6BC6B'}`, fontWeight: 600 }} key={index}>
                    {code}
                </code>
            );
        }

        return [
            ...parse(prefix),
            element,
            ...parse(suffix)
        ];
    };

    return parse(text);
};

// Parse full Markdown text into block-level elements
const parseMarkdown = (md) => {
    if (!md) return [];
    
    // Normalize newlines
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // 1. Code blocks (starts with ```)
        if (line.trim().startsWith('```')) {
            const lang = line.trim().slice(3).trim();
            let codeLines = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            blocks.push({
                type: 'code',
                language: lang || 'code',
                code: codeLines.join('\n')
            });
            i++;
            continue;
        }

        // 2. Blockquotes & Callout Boxes (starts with >)
        if (line.trim().startsWith('>')) {
            let quoteLines = [];
            while (i < lines.length && (lines[i].trim().startsWith('>') || (lines[i].trim() !== '' && quoteLines.length > 0 && !lines[i].trim().match(/^(?:#|\-|\*|\d+\.|```|\|)/)))) {
                if (lines[i].trim().startsWith('>')) {
                    quoteLines.push(lines[i].trim().substring(1).trim());
                } else {
                    quoteLines.push(lines[i].trim());
                }
                i++;
            }
            const fullText = quoteLines.join(' ');
            
            // Check for callout flags: [!TIP], **TIP**, TIP: etc.
            let calloutType = null;
            let contentText = fullText;

            const calloutPatterns = [
                { type: 'tip', regex: /^\[!TIP\]/i },
                { type: 'tip', regex: /^\*\*TIP\*\*:/i },
                { type: 'tip', regex: /^TIP:/i },
                { type: 'info', regex: /^\[!INFO\]/i },
                { type: 'info', regex: /^\*\*INFO\*\*:/i },
                { type: 'info', regex: /^INFO:/i },
                { type: 'success', regex: /^\[!SUCCESS\]/i },
                { type: 'success', regex: /^\*\*SUCCESS\*\*:/i },
                { type: 'success', regex: /^SUCCESS:/i },
                { type: 'warning', regex: /^\[!WARNING\]/i },
                { type: 'warning', regex: /^\*\*WARNING\*\*:/i },
                { type: 'warning', regex: /^WARNING:/i },
                { type: 'research', regex: /^\[!RESEARCH\]/i },
                { type: 'research', regex: /^\*\*RESEARCH\*\*:/i },
                { type: 'research', regex: /^RESEARCH:/i }
            ];

            for (const pattern of calloutPatterns) {
                if (pattern.regex.test(contentText)) {
                    calloutType = pattern.type;
                    contentText = contentText.replace(pattern.regex, '').trim();
                    break;
                }
            }

            blocks.push({
                type: calloutType ? 'callout' : 'blockquote',
                calloutType,
                text: contentText
            });
            continue;
        }

        // 3. Tables (starts with |)
        if (line.trim().startsWith('|')) {
            let tableLines = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                tableLines.push(lines[i].trim());
                i++;
            }
            
            if (tableLines.length >= 2) {
                const parseRow = (rowStr) => {
                    const cells = rowStr.split('|').map(c => c.trim());
                    if (cells[0] === '') cells.shift();
                    if (cells[cells.length - 1] === '') cells.pop();
                    return cells;
                };

                const headers = parseRow(tableLines[0]);
                const rows = [];
                // Skip row index 1 which is separator e.g., |---|---|
                for (let r = 2; r < tableLines.length; r++) {
                    rows.push(parseRow(tableLines[r]));
                }
                blocks.push({
                    type: 'table',
                    headers,
                    rows
                });
            } else if (tableLines.length === 1) {
                blocks.push({
                    type: 'paragraph',
                    text: tableLines[0]
                });
            }
            continue;
        }

        // 4. Headings (starts with #)
        if (line.trim().startsWith('#')) {
            const match = line.trim().match(/^(#{1,6})\s+(.*)$/);
            if (match) {
                const level = match[1].length;
                const text = match[2].trim();
                const id = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || `heading-${i}`;
                blocks.push({
                    type: 'heading',
                    level,
                    text,
                    id
                });
                i++;
                continue;
            }
        }

        // 5. Lists (starts with -, *, +, or 1.)
        if (line.trim().match(/^([\-\*\+]\s|\d+\.\s)/)) {
            let listItems = [];
            let isOrdered = line.trim().match(/^\d+\./) !== null;
            
            while (i < lines.length && lines[i].trim().match(/^([\-\*\+]\s|\d+\.\s)/)) {
                const itemLine = lines[i].trim();
                const text = itemLine.replace(/^([\-\*\+]\s|\d+\.\s)/, '').trim();
                listItems.push(text);
                i++;
            }
            blocks.push({
                type: 'list',
                ordered: isOrdered,
                items: listItems
            });
            continue;
        }

        // 6. Horizontal Rule (---, ***)
        if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
            blocks.push({ type: 'hr' });
            i++;
            continue;
        }

        // 7. Blank lines
        if (line.trim() === '') {
            i++;
            continue;
        }

        // 8. Image block
        const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgMatch) {
            blocks.push({
                type: 'image',
                alt: imgMatch[1],
                src: imgMatch[2]
            });
            i++;
            continue;
        }

        // 9. Standard paragraphs
        let paraLines = [];
        while (i < lines.length && 
               lines[i].trim() !== '' && 
               !lines[i].trim().startsWith('```') &&
               !lines[i].trim().startsWith('>') &&
               !lines[i].trim().startsWith('|') &&
               !lines[i].trim().startsWith('#') &&
               !lines[i].trim().match(/^([\-\*\+]\s|\d+\.\s)/) &&
               lines[i].trim() !== '---' && lines[i].trim() !== '***' &&
               !lines[i].trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/)) {
            paraLines.push(lines[i].trim());
            i++;
        }
        if (paraLines.length > 0) {
            blocks.push({
                type: 'paragraph',
                text: paraLines.join(' ')
            });
        }
    }

    return blocks;
};

// Parse HTML contents into block-level elements
// Uses recursive traversal to find headings at ANY nesting depth
const parseHTML = (htmlString) => {
    if (!htmlString) return [];
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const body = doc.body;
        const blocks = [];

        // Recursive function to process elements at any depth
        const processElement = (el) => {
            const tagName = el.tagName.toLowerCase();

            // 1. Headings (h1-h6) — found at any nesting depth
            if (/^h[1-6]$/.test(tagName)) {
                const level = parseInt(tagName.substring(1));
                const text = el.textContent.trim();
                if (text) {
                    const id = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || `heading-${Math.floor(Math.random() * 10000)}`;
                    blocks.push({
                        type: 'heading',
                        level,
                        text,
                        id,
                        isHTML: true
                    });
                }
                return;
            }

            // 2. Code blocks (pre/code)
            if (tagName === 'pre') {
                const codeEl = el.querySelector('code');
                const code = codeEl ? codeEl.textContent : el.textContent;
                let language = 'code';
                const className = codeEl ? codeEl.className : '';
                const match = className.match(/language-(\w+)/);
                if (match) language = match[1];
                
                blocks.push({
                    type: 'code',
                    language,
                    code
                });
                return;
            }

            // 3. Blockquotes & Callouts
            if (tagName === 'blockquote') {
                const text = el.textContent.trim();
                let calloutType = null;
                let contentText = text;
                
                if (el.classList.contains('callout-box')) {
                    calloutType = 'info';
                    if (el.classList.contains('tip')) calloutType = 'tip';
                    else if (el.classList.contains('success')) calloutType = 'success';
                    else if (el.classList.contains('warning')) calloutType = 'warning';
                }

                const calloutPatterns = [
                    { type: 'tip', regex: /^\[!TIP\]/i },
                    { type: 'tip', regex: /^\*\*TIP\*\*:/i },
                    { type: 'tip', regex: /^TIP:/i },
                    { type: 'info', regex: /^\[!INFO\]/i },
                    { type: 'info', regex: /^\*\*INFO\*\*:/i },
                    { type: 'info', regex: /^INFO:/i },
                    { type: 'success', regex: /^\[!SUCCESS\]/i },
                    { type: 'success', regex: /^\*\*SUCCESS\*\*:/i },
                    { type: 'success', regex: /^SUCCESS:/i },
                    { type: 'warning', regex: /^\[!WARNING\]/i },
                    { type: 'warning', regex: /^\*\*WARNING\*\*:/i },
                    { type: 'warning', regex: /^WARNING:/i },
                    { type: 'research', regex: /^\[!RESEARCH\]/i },
                    { type: 'research', regex: /^\*\*RESEARCH\*\*:/i },
                    { type: 'research', regex: /^RESEARCH:/i }
                ];

                for (const pattern of calloutPatterns) {
                    if (pattern.regex.test(contentText)) {
                        calloutType = pattern.type;
                        contentText = contentText.replace(pattern.regex, '').trim();
                        break;
                    }
                }

                blocks.push({
                    type: calloutType ? 'callout' : 'blockquote',
                    calloutType,
                    text: contentText,
                    isHTML: true
                });
                return;
            }

            // 4. Tables
            if (tagName === 'table') {
                const headers = [];
                const rows = [];
                
                const thElements = el.querySelectorAll('th');
                if (thElements.length > 0) {
                    thElements.forEach(th => headers.push(th.innerHTML.trim()));
                }

                const trElements = el.querySelectorAll('tbody tr');
                trElements.forEach(tr => {
                    const rowCells = [];
                    tr.querySelectorAll('td').forEach(td => rowCells.push(td.innerHTML.trim()));
                    rows.push(rowCells);
                });

                if (rows.length === 0) {
                    const allTrs = el.querySelectorAll('tr');
                    allTrs.forEach((tr, index) => {
                        if (index === 0 && thElements.length > 0) return;
                        const rowCells = [];
                        tr.querySelectorAll('td, th').forEach(td => rowCells.push(td.innerHTML.trim()));
                        if (rowCells.length > 0) rows.push(rowCells);
                    });
                }

                blocks.push({
                    type: 'table',
                    headers,
                    rows,
                    isHTML: true
                });
                return;
            }

            // 5. Lists
            if (tagName === 'ul' || tagName === 'ol') {
                const items = [];
                el.querySelectorAll(':scope > li').forEach(li => {
                    items.push(li.innerHTML.trim());
                });
                blocks.push({
                    type: 'list',
                    ordered: tagName === 'ol',
                    items,
                    isHTML: true
                });
                return;
            }

            // 6. Horizontal Rule
            if (tagName === 'hr') {
                blocks.push({ type: 'hr' });
                return;
            }

            // 7. Images
            if (tagName === 'img') {
                blocks.push({
                    type: 'image',
                    src: el.getAttribute('src') || '',
                    alt: el.getAttribute('alt') || ''
                });
                return;
            }
            
            // Check for img-only paragraphs/spans
            if ((tagName === 'p' || tagName === 'span') && el.querySelector('img') && el.children.length === 1) {
                const img = el.querySelector('img');
                blocks.push({
                    type: 'image',
                    src: img.getAttribute('src') || '',
                    alt: img.getAttribute('alt') || ''
                });
                return;
            }

            // 8. Container elements (div, section, article, main, aside, figure) — recurse into children
            if (['div', 'section', 'article', 'main', 'aside', 'figure', 'header', 'footer', 'span'].includes(tagName)) {
                // Check if this container has structural children (headings, lists, etc)
                const hasStructuralChildren = el.querySelector('h1, h2, h3, h4, h5, h6, p, ul, ol, table, pre, blockquote, img, hr');
                if (hasStructuralChildren) {
                    // Recurse into children
                    Array.from(el.children).forEach(child => processElement(child));
                    return;
                }
                // Otherwise treat as paragraph
                const text = el.innerHTML.trim();
                if (text) {
                    blocks.push({
                        type: 'paragraph',
                        text,
                        isHTML: true
                    });
                }
                return;
            }

            // 9. Paragraphs and everything else
            const text = el.innerHTML?.trim();
            if (text) {
                blocks.push({
                    type: 'paragraph',
                    text,
                    isHTML: true
                });
            }
        };

        Array.from(body.children).forEach(el => processElement(el));
        return blocks;
    } catch (err) {
        console.error("DOMParser HTML parsing failed, fallback to raw", err);
        return [{ type: 'paragraph', text: htmlString, isHTML: true }];
    }
};

// ==========================================
// AUTO-GENERATE TOC HEADINGS FOR CONTENT WITHOUT HEADINGS
// ==========================================
// Scans parsed blocks for patterns that look like section starts:
//   - Paragraphs starting with <strong>/<b> or **bold** text (common blog pattern)
//   - Numbered patterns like "1. " or "Step 1:" at the beginning
// Promotes them to synthetic h2 headings so every article gets a TOC.
const autoGenerateHeadings = (blocks) => {
    const hasHeadings = blocks.some(b => b.type === 'heading');
    if (hasHeadings) return blocks; // Already has headings, no need to generate
    
    const newBlocks = [];
    let sectionCount = 0;
    
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        
        if (block.type === 'paragraph' && block.text) {
            let headingText = null;
            
            if (block.isHTML) {
                // Pattern 1: Paragraph starts with <strong> or <b> tag containing section-like text
                const strongMatch = block.text.match(/^<(?:strong|b)>\s*(.+?)\s*<\/(?:strong|b)>/i);
                if (strongMatch) {
                    const candidateText = strongMatch[1].replace(/<[^>]*>/g, '').trim();
                    // Only promote if it looks like a heading (short enough, no period at end, etc)
                    if (candidateText.length > 3 && candidateText.length < 120 && !candidateText.endsWith('.') && !candidateText.endsWith(',')) {
                        headingText = candidateText;
                    }
                }
                
                // Pattern 2: Paragraph that IS just a bold/strong element
                const pureBoldMatch = block.text.match(/^<(?:strong|b)>\s*(.+?)\s*<\/(?:strong|b)>\s*$/i);
                if (pureBoldMatch) {
                    const candidateText = pureBoldMatch[1].replace(/<[^>]*>/g, '').trim();
                    if (candidateText.length > 3 && candidateText.length < 120) {
                        headingText = candidateText;
                    }
                }
            } else {
                // Markdown: paragraph starting with **bold text**
                const boldMatch = block.text.match(/^\*\*(.+?)\*\*/);
                if (boldMatch) {
                    const candidateText = boldMatch[1].trim();
                    if (candidateText.length > 3 && candidateText.length < 120 && !candidateText.endsWith('.') && !candidateText.endsWith(',')) {
                        headingText = candidateText;
                    }
                }
                
                // Markdown: numbered section like "1. Title" or "Step 1: Title"
                const numberedMatch = block.text.match(/^(?:(?:Step\s+)?\d+[.):]+\s+)\*\*(.+?)\*\*/);
                if (numberedMatch) {
                    headingText = numberedMatch[1].trim();
                }
            }
            
            if (headingText) {
                sectionCount++;
                const id = headingText.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
                newBlocks.push({
                    type: 'heading',
                    level: 2,
                    text: headingText,
                    id: id || `section-${sectionCount}`,
                    isHTML: false,
                    isSynthetic: true // marker so we know this was auto-generated
                });
                
                // Remove the bold prefix from the paragraph if it was the entire content
                if (block.isHTML) {
                    const remaining = block.text.replace(/^<(?:strong|b)>\s*.+?\s*<\/(?:strong|b)>\s*/i, '').trim();
                    if (remaining) {
                        newBlocks.push({ ...block, text: remaining });
                    }
                } else {
                    const remaining = block.text.replace(/^\*\*(.+?)\*\*\s*/, '').trim();
                    if (remaining) {
                        newBlocks.push({ ...block, text: remaining });
                    }
                }
                continue;
            }
        }
        
        newBlocks.push(block);
    }
    
    // If we still found zero headings after bold-text analysis, create section markers
    const generatedHeadingsCount = newBlocks.filter(b => b.type === 'heading').length;
    if (generatedHeadingsCount === 0 && newBlocks.length > 0) {
        const paragraphs = newBlocks.filter(b => b.type === 'paragraph');
        const sectionSize = Math.max(2, Math.ceil(paragraphs.length / Math.min(5, Math.max(1, Math.ceil(paragraphs.length / 3)))));
        const result = [];
        let paraCount = 0;
        let sectionNum = 0;
        const sectionNames = ['Introduction', 'Key Insights', 'Deep Dive', 'Analysis', 'Best Practices', 'Implementation', 'Takeaways', 'Conclusion'];
        
        let addedHeading = false;
        
        for (let i = 0; i < newBlocks.length; i++) {
            const block = newBlocks[i];
            
            if (block.type === 'paragraph' && sectionNum < sectionNames.length) {
                if (paraCount % sectionSize === 0) {
                    const name = sectionNames[sectionNum];
                    const id = name.toLowerCase().replace(/[^\w]+/g, '-');
                    result.push({
                        type: 'heading',
                        level: 2,
                        text: name,
                        id: id || `section-${sectionNum}`,
                        isHTML: false,
                        isSynthetic: true
                    });
                    sectionNum++;
                    addedHeading = true;
                }
                paraCount++;
            }
            result.push(block);
        }
        
        if (!addedHeading) {
            return [
                {
                    type: 'heading',
                    level: 2,
                    text: 'Overview',
                    id: 'overview',
                    isHTML: false,
                    isSynthetic: true
                },
                ...newBlocks
            ];
        }
        
        return result;
    }
    
    return newBlocks;
};

// Unified Content Parser (HTML or Markdown)
const parseContent = (content) => {
    if (!content) return [];
    const trimmed = content.trim();
    let blocks;
    if (trimmed.startsWith('<')) {
        blocks = parseHTML(trimmed);
    } else {
        blocks = parseMarkdown(trimmed);
    }
    // Auto-generate headings for articles that don't have any
    return autoGenerateHeadings(blocks);
};

// ==========================================
// TYPOGRAPHY & BLOCK REACT COMPONENTS
// ==========================================

const Heading2 = ({ id, text, isHTML, isDark }) => {
    const [copied, setCopied] = useState(false);
    
    const copyLink = () => {
        const url = `${window.location.origin}${window.location.pathname}#${id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <h2 
            id={id} 
            className="group scroll-mt-28 flex items-center gap-2 cursor-pointer select-text"
            style={{ fontSize: '32px', fontWeight: 700, color: isDark ? '#F8FAFC' : '#20263A', marginTop: '64px', marginBottom: '24px', letterSpacing: '-0.01em' }}
            onClick={copyLink}
        >
            {isHTML ? <span dangerouslySetInnerHTML={{ __html: text }} /> : <span>{parseInline(text, isDark)}</span>}
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: isDark ? '#E6BC6B' : '#C99A45', fontSize: '1.125rem' }}>
                {copied ? '✓' : '#'}
            </span>
        </h2>
    );
};

const Heading3 = ({ id, text, isHTML, isDark }) => {
    const [copied, setCopied] = useState(false);

    const copyLink = () => {
        const url = `${window.location.origin}${window.location.pathname}#${id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <h3 
            id={id} 
            className="group scroll-mt-28 flex items-center gap-2 cursor-pointer select-text"
            style={{ fontSize: '24px', fontWeight: 600, color: isDark ? '#E2E8F0' : '#252A3D', marginTop: '40px', marginBottom: '16px' }}
            onClick={copyLink}
        >
            {isHTML ? <span dangerouslySetInnerHTML={{ __html: text }} /> : <span>{parseInline(text, isDark)}</span>}
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: isDark ? '#E6BC6B' : '#C99A45' }}>
                {copied ? '✓' : '#'}
            </span>
        </h3>
    );
};

const Paragraph = ({ text, isHTML, isDark }) => {
    if (isHTML) {
        return (
            <p 
                style={{ fontSize: '18px', fontWeight: 400, lineHeight: 1.85, color: isDark ? '#CBD5E1' : '#252A3D', maxWidth: '80ch', marginBottom: '24px' }}
                className="select-text"
                dangerouslySetInnerHTML={{ __html: text }}
            />
        );
    }
    return (
        <p style={{ fontSize: '18px', fontWeight: 400, lineHeight: 1.85, color: isDark ? '#CBD5E1' : '#252A3D', maxWidth: '80ch', marginBottom: '24px' }} className="select-text">
            {parseInline(text, isDark)}
        </p>
    );
};

const CustomList = ({ ordered, items, isHTML, isDark }) => {
    const Tag = ordered ? 'ol' : 'ul';
    return (
        <Tag style={{ marginLeft: '2rem', marginBottom: '24px', fontSize: '18px', lineHeight: 1.85, color: isDark ? '#CBD5E1' : '#252A3D', listStyleType: ordered ? 'decimal' : 'none' }} className="space-y-3">
            {items.map((item, index) => (
                <li key={index} className="relative select-text">
                    {!ordered && (
                        <span style={{ position: 'absolute', left: '-1.5rem', top: '0.875rem', width: '6px', height: '6px', borderRadius: '50%', background: isDark ? '#E6BC6B' : '#C99A45', flexShrink: 0 }}></span>
                    )}
                    {isHTML ? <span dangerouslySetInnerHTML={{ __html: item }} /> : <span>{parseInline(item, isDark)}</span>}
                </li>
            ))}
        </Tag>
    );
};

const Blockquote = ({ text, isHTML, isDark }) => {
    return (
        <blockquote style={{ borderLeft: `4px solid ${isDark ? '#E6BC6B' : '#C99A45'}`, paddingLeft: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', margin: '2rem 0', background: isDark ? 'rgba(32,38,58,0.4)' : '#F4EBDD', borderRadius: '0 1rem 1rem 0' }} className="select-text">
            <p style={{ fontStyle: 'italic', color: isDark ? '#F8FAFC' : '#20263A', fontSize: '18px', lineHeight: 1.8, fontWeight: 500 }}>
                {isHTML ? <span dangerouslySetInnerHTML={{ __html: text }} /> : <>"{parseInline(text, isDark)}"</>}
            </p>
        </blockquote>
    );
};

const Table = ({ headers, rows, isHTML, isDark }) => {
    return (
        <div className="my-8 overflow-hidden max-w-full overflow-x-auto" style={{ borderRadius: '0.75rem', border: `1px solid ${isDark ? '#232B40' : '#E3E5EC'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table className="w-full text-left border-collapse text-sm" style={{ color: isDark ? '#CBD5E1' : '#5E6577' }}>
                <thead>
                    <tr style={{ background: isDark ? '#151928' : '#F8F8FA', borderBottom: `1px solid ${isDark ? '#232B40' : '#E3E5EC'}` }}>
                        {headers.map((h, index) => (
                            <th key={index} style={{ padding: '1rem 1.5rem', fontWeight: 700, color: isDark ? '#F8FAFC' : '#20263A', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                                {isHTML ? <span dangerouslySetInnerHTML={{ __html: h }} /> : parseInline(h, isDark)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rIndex) => (
                        <tr 
                            key={rIndex} 
                            style={{ background: rIndex % 2 === 0 ? (isDark ? '#0E121E' : '#FFFFFF') : (isDark ? '#151928' : '#FAFBFD'), borderBottom: rIndex < rows.length - 1 ? `1px solid ${isDark ? '#232B40' : '#F1F2F6'}` : 'none' }}
                        >
                            {row.map((cell, cIndex) => (
                                <td key={cIndex} style={{ padding: '1rem 1.5rem', lineHeight: 1.6 }}>
                                    {isHTML ? <span dangerouslySetInnerHTML={{ __html: cell }} /> : parseInline(cell, isDark)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const CodeBlock = ({ language, code, isDark }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-8 overflow-hidden group relative" style={{ borderRadius: '0.75rem', border: `1px solid ${isDark ? '#232B40' : '#E3E5EC'}`, background: '#0e121e', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <div className="flex items-center justify-between px-4 py-2.5 text-xs font-mono select-none" style={{ background: '#151928', borderBottom: '1px solid #232B40', color: '#8C93A4' }}>
                <span className="uppercase tracking-wider font-semibold">{language}</span>
                <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 hover:text-white transition-colors duration-200 py-1 px-2 rounded cursor-pointer"
                    style={{ background: 'transparent', border: 'none', color: '#8C93A4' }}
                >
                    {copied ? (
                        <>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C99A45' }}></span>
                            <span style={{ color: '#E6BC6B', fontWeight: 500 }}>Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy size={13} />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <pre className="p-5 overflow-x-auto text-sm font-mono leading-relaxed select-text" style={{ color: '#e2e8f0' }}>
                <code>{code}</code>
            </pre>
        </div>
    );
};

const Callout = ({ type, text, isHTML, isDark }) => {
    let config;

    const configs = {
        info: {
            bg: isDark ? 'rgba(32,38,58,0.45)' : 'rgba(244,235,221,0.5)',
            border: isDark ? '#E6BC6B' : '#C99A45',
            titleColor: isDark ? '#E6BC6B' : '#8C6B28',
            label: 'INFO',
            icon: <Info size={18} style={{ color: isDark ? '#E6BC6B' : '#C99A45' }} />
        },
        success: {
            bg: isDark ? 'rgba(6,78,59,0.25)' : 'rgba(209,250,229,0.4)',
            border: isDark ? '#10b981' : '#10b981',
            titleColor: isDark ? '#6ee7b7' : '#065f46',
            label: 'SUCCESS',
            icon: <Check size={18} style={{ color: isDark ? '#34d399' : '#10b981' }} />
        },
        warning: {
            bg: isDark ? 'rgba(120,53,15,0.25)' : 'rgba(254,243,199,0.4)',
            border: isDark ? '#f59e0b' : '#f59e0b',
            titleColor: isDark ? '#fcd34d' : '#92400e',
            label: 'WARNING',
            icon: <AlertTriangle size={18} style={{ color: isDark ? '#fbbf24' : '#f59e0b' }} />
        },
        tip: {
            bg: isDark ? 'rgba(32,38,58,0.45)' : 'rgba(244,235,221,0.5)',
            border: isDark ? '#E6BC6B' : '#C99A45',
            titleColor: isDark ? '#E6BC6B' : '#8C6B28',
            label: 'TIP',
            icon: <Sparkles size={18} style={{ color: isDark ? '#E6BC6B' : '#C99A45' }} />
        },
        research: {
            bg: isDark ? 'rgba(13,148,136,0.15)' : 'rgba(204,251,241,0.4)',
            border: isDark ? '#14b8a6' : '#14b8a6',
            titleColor: isDark ? '#5eead4' : '#115e59',
            label: 'RESEARCH',
            icon: <BookOpen size={18} style={{ color: isDark ? '#2dd4bf' : '#14b8a6' }} />
        }
    };

    config = configs[type] || configs.info;

    return (
        <div className="flex gap-4 items-start" style={{ margin: '2rem 0', padding: '1.5rem', borderRadius: '0 1rem 1rem 0', background: config.bg, borderLeft: `6px solid ${config.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="mt-0.5 shrink-0 select-none">
                {config.icon}
            </div>
            <div className="space-y-1">
                <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: config.titleColor }}>{config.label}</span>
                <div style={{ color: isDark ? '#cbd5e1' : '#475569', lineHeight: 1.6, fontSize: '17px' }}>
                    {isHTML ? <div dangerouslySetInnerHTML={{ __html: text }} /> : parseInline(text, isDark)}
                </div>
            </div>
        </div>
    );
};

const Divider = ({ isDark }) => {
    return <hr style={{ margin: '3rem auto', borderTop: `1px solid ${isDark ? '#232B40' : '#E3E5EC'}`, maxWidth: '320px' }} />;
};

const renderBlock = (block, index, isDark) => {
    switch (block.type) {
        case 'heading':
            if (block.level === 1 || block.level === 2) return <Heading2 key={index} id={block.id} text={block.text} isHTML={block.isHTML} isDark={isDark} />;
            return <Heading3 key={index} id={block.id} text={block.text} isHTML={block.isHTML} isDark={isDark} />;
        case 'code':
            return <CodeBlock key={index} language={block.language} code={block.code} isDark={isDark} />;
        case 'callout':
            return <Callout key={index} type={block.calloutType} text={block.text} isHTML={block.isHTML} isDark={isDark} />;
        case 'blockquote':
            return <Blockquote key={index} text={block.text} isHTML={block.isHTML} isDark={isDark} />;
        case 'table':
            return <Table key={index} headers={block.headers} rows={block.rows} isHTML={block.isHTML} isDark={isDark} />;
        case 'list':
            return <CustomList key={index} ordered={block.ordered} items={block.items} isHTML={block.isHTML} isDark={isDark} />;
        case 'image':
            return (
                <span className="block my-10 select-none" key={index}>
                    <img src={block.src} alt={block.alt} loading="lazy" decoding="async" crossOrigin="anonymous" referrerPolicy="no-referrer" style={{ borderRadius: '1rem', border: `1px solid ${isDark ? '#232B40' : '#E3E5EC'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', height: 'auto', margin: '0 auto', display: 'block' }} />
                </span>
            );
        case 'hr':
            return <Divider key={index} isDark={isDark} />;
        case 'paragraph':
            return <Paragraph key={index} text={block.text} isHTML={block.isHTML} isDark={isDark} />;
        default:
            return null;
    }
};

// ==========================================
// TABLE OF CONTENTS COMPONENT
// ==========================================

const TableOfContents = ({ items, activeId, onItemClick, collapsed, onToggle, isDark }) => {
    if (!items || items.length === 0) return null;
    
    return (
        <div className="space-y-4 font-sans font-normal" style={{ color: isDark ? '#e2e8f0' : '#252A3D' }}>
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${isDark ? '#232B40' : '#E3E5EC'}` }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: isDark ? '#F8FAFC' : '#20263A' }}>Contents</span>
                {onToggle && (
                    <button 
                        onClick={onToggle}
                        style={{ fontSize: '0.75rem', color: isDark ? '#E6BC6B' : '#C99A45', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'color 0.2s', cursor: 'pointer', background: 'none', border: 'none' }}
                    >
                        {collapsed ? 'Show' : 'Hide'}
                    </button>
                )}
            </div>
            {!collapsed && (
                <ul className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin select-none" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {items.map((item) => {
                        const isActive = activeId === item.id;
                        return (
                            <li 
                                key={item.id}
                                className="transition-all duration-200"
                                style={{ 
                                    borderLeft: `2px solid ${isActive ? (isDark ? '#E6BC6B' : '#C99A45') : (isDark ? '#232B40' : '#E3E5EC')}`,
                                    color: isActive ? (isDark ? '#E6BC6B' : '#20263A') : (isDark ? '#64748B' : '#8C93A4'),
                                    fontWeight: isActive ? 700 : 400,
                                    paddingLeft: `${(item.level - 2) * 12 + 16}px`
                                }}
                            >
                                <a 
                                    href={`#${item.id}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onItemClick(item.id);
                                    }}
                                    className="block py-0.5 truncate cursor-pointer transition-colors duration-200"
                                    style={{ fontSize: '13px', textDecoration: 'none', color: 'inherit' }}
                                >
                                    {item.text}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function BlogPostDetailsPage() {
    const { isDark, toggleTheme } = useBlogTheme();
    const { slug } = useParams();
    const location = useLocation();
    const statePost = location.state?.post;
    const [post, setPost] = useState(statePost || null);
    const [related, setRelated] = useState([]);
    const [loading, setLoading] = useState(!statePost);
    const [toc, setToc] = useState([]);
    const [activeTocId, setActiveTocId] = useState('');
    const [scrollProgress, setScrollProgress] = useState(0);
    const [copied, setCopied] = useState(false);
    
    // Responsive TOC states
    const [mobileTocOpen, setMobileTocOpen] = useState(false);
    const [tabletTocCollapsed, setTabletTocCollapsed] = useState(true);

    const articleRef = useRef(null);

    // Theme-aware tokens
    const t = isDark ? {
        pageBg: '#0e121e',
        pageText: '#cbd5e1',
        cardBg: '#151928',
        cardBorder: '#232b40',
        headerBg: '#151928',
        headerBorder: '#232b40',
        headingText: '#f8fafc',
        subText: '#94a3b8',
        mutedText: '#64748b',
        accentText: '#e6bc6b',
        accentBg: '#c99a45',
        badgeBg: 'rgba(201, 154, 69, 0.18)',
        badgeText: '#e6bc6b',
        badgeBorder: 'rgba(230, 188, 107, 0.35)',
        progressBg: '#232b40',
        progressBar: '#e6bc6b',
        btnBg: '#151928',
        btnBorder: '#232b40',
        btnText: '#94a3b8',
        btnHoverBg: '#20263a',
        ctaGradient: 'linear-gradient(135deg, #151928 0%, #20263a 100%)',
        ctaText: '#ffffff',
        ctaBorder: '#232b40',
        relCardBg: '#151928',
        relCardBorder: '#232b40',
        relCardHoverBorder: '#e6bc6b',
        mobileTocBg: '#151928',
        mobileTocBorder: '#232b40',
        overlayBg: 'rgba(0,0,0,0.65)',
        copiedBg: 'rgba(201,154,69,0.15)',
        copiedBorder: '#e6bc6b',
        copiedText: '#e6bc6b',
        tocStickyBg: 'transparent',
    } : {
        pageBg: '#F8F8FA',
        pageText: '#252A3D',
        cardBg: '#ffffff',
        cardBorder: '#E3E5EC',
        headerBg: '#ffffff',
        headerBorder: '#E3E5EC',
        headingText: '#20263A',
        subText: '#5E6577',
        mutedText: '#8C93A4',
        accentText: '#C99A45',
        accentBg: '#20263A',
        badgeBg: '#F4EBDD',
        badgeText: '#8C6B28',
        badgeBorder: '#E6BC6B',
        progressBg: '#E3E5EC',
        progressBar: '#20263A',
        btnBg: '#F8F8FA',
        btnBorder: '#E3E5EC',
        btnText: '#5E6577',
        btnHoverBg: '#F4EBDD',
        ctaGradient: 'linear-gradient(135deg, #20263A 0%, #181D2D 100%)',
        ctaText: '#ffffff',
        ctaBorder: '#20263A',
        relCardBg: '#ffffff',
        relCardBorder: '#E3E5EC',
        relCardHoverBorder: '#C99A45',
        mobileTocBg: '#ffffff',
        mobileTocBorder: '#E3E5EC',
        overlayBg: 'rgba(32,38,58,0.65)',
        copiedBg: 'rgba(201,154,69,0.12)',
        copiedBorder: '#C99A45',
        copiedText: '#8C6B28',
        tocStickyBg: 'transparent',
    };

    // Fetch article details & related posts
    useEffect(() => {
        const fetchArticleData = async () => {
            if (!statePost) {
                setLoading(true);
            }
            try {
                const res = await getBlogPostBySlug(slug);
                if (res?.success && res.post) {
                    setPost(res.post);

                    // Fetch related posts
                    const relRes = await getRelatedPosts(res.post._id);
                    setRelated(relRes.posts || []);
                } else {
                    setPost(null);
                }
            } catch (err) {
                console.error("Failed to load article:", err);
                if (!statePost) {
                    setPost(null);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchArticleData();
    }, [slug, statePost]);

    // Parse Content blocks to React Elements memoized
    const parsedBlocks = useMemo(() => {
        return parseContent(post?.content);
    }, [post?.content]);

    // Update TOC headings from parsed blocks
    useEffect(() => {
        if (parsedBlocks.length > 0) {
            const headingItems = parsedBlocks
                .filter(b => b.type === 'heading')
                .map(b => ({ id: b.id, text: b.text, level: (b.level === 1 || b.level === 2) ? 2 : 3 }));
            setToc(headingItems);
        } else {
            setToc([]);
        }
    }, [parsedBlocks]);

    // Handle scroll progress and active TOC highlight
    useEffect(() => {
        const handleScroll = () => {
            // 1. Reading Progress
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (totalHeight > 0) {
                const progress = (window.scrollY / totalHeight) * 100;
                setScrollProgress(progress);
            }

            // 2. Dynamic TOC Highlighting based on viewport
            const headings = articleRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6') || [];
            let currentActiveId = '';
            
            for (let i = 0; i < headings.length; i++) {
                const rect = headings[i].getBoundingClientRect();
                // If heading is near the top of the viewport
                if (rect.top <= 150) {
                    currentActiveId = headings[i].id;
                }
            }

            if (currentActiveId) {
                setActiveTocId(currentActiveId);
            } else if (headings.length > 0) {
                setActiveTocId(headings[0].id); // default to first
            }
        };

        window.addEventListener('scroll', handleScroll);
        // Initial run
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [toc]);

    // Calculate reading time based on 225 words per minute
    const calculateReadTime = (text) => {
        if (!text) return '3 min read';
        const words = text.trim().split(/\s+/).length;
        const time = Math.ceil(words / 225);
        return `${time} min read`;
    };

    // Social Sharing Helpers
    const shareOnLinkedIn = () => {
        const shareUrl = encodeURIComponent(window.location.href);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, '_blank');
    };

    const shareOnTwitter = () => {
        const shareUrl = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(`Check out this article from @Hire1Percent: ${post?.title}`);
        window.open(`https://twitter.com/intent/tweet?url=${shareUrl}&text=${text}`, '_blank');
    };

    const copyLinkToClipboard = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Handle scroll to TOC anchor smoothly
    const handleTocClick = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveTocId(id);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: t.pageBg, color: t.mutedText }}>
                <Loader2 className="animate-spin mr-3" size={24} style={{ color: t.accentText }} />
                <span className="font-bold uppercase tracking-wider text-xs">Loading article details...</span>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: t.pageBg, color: t.pageText }}>
                <BookOpen className="opacity-20 mb-4" size={64} style={{ color: t.mutedText }} />
                <h2 className="text-2xl font-black mb-2" style={{ color: t.headingText }}>Article Not Found</h2>
                <p className="text-sm max-w-sm mb-6" style={{ color: t.subText }}>The article you are looking for may have been archived, deleted, or the URL slug is misspelled.</p>
                <Link to="/blog" className="px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all" style={{ background: t.accentBg, color: '#ffffff' }}>
                    Back to Blog Landing
                </Link>
            </div>
        );
    }

    const seoTitle = post.seo?.metaTitle || `${post.title} | Hire1Percent Blog`;
    const seoDesc = post.seo?.metaDescription || post.subtitle || post.content.substring(0, 155).replace(/[#*`_]/g, '');
    const canonicalUrl = `https://www.hire1percent.com/blog/${post.slug}`;
    const coverUrl = post.coverImage || `${window.location.origin}/og-image.png`;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.subtitle || seoDesc,
        "image": coverUrl,
        "author": {
            "@type": "Person",
            "name": "Hire1Percent Team",
            "jobTitle": "Editorial Board"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Hire1Percent",
            "logo": {
                "@type": "ImageObject",
                "url": `${window.location.origin}/logo.png`
            }
        },
        "datePublished": post.publishedAt || post.createdAt,
        "dateModified": post.updatedAt,
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl
        }
    };

    const CATEGORY_MAP = {
        'technical-assessments': 'Interview Prep',
        'ai-hiring': 'Tech Recruiting',
        'engineering-hiring': 'Engineering',
        'product-updates': 'Product Updates'
    };

    const categorySlug = typeof post.category === 'object' ? post.category?.slug : post.category;
    const categoryLabel = CATEGORY_MAP[categorySlug] || (typeof post.category === 'object' ? post.category?.name : post.category) || 'Insights';

    return (
        <div className="min-h-screen font-sans relative" style={{ color: t.pageText, background: t.pageBg, paddingBottom: '7rem', paddingTop: '4rem', transition: 'background 0.4s ease, color 0.4s ease' }}>
            <style>{`
                .blog-details-theme-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 1px solid ${isDark ? '#232B40' : '#E3E5EC'};
                    background: ${isDark ? '#151928' : '#ffffff'};
                    color: ${isDark ? '#E6BC6B' : '#C99A45'};
                    cursor: pointer;
                    transition: all 0.3s ease;
                    flex-shrink: 0;
                    position: fixed;
                    top: 80px;
                    right: 24px;
                    z-index: 40;
                    box-shadow: 0 2px 8px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'};
                }
                .blog-details-theme-toggle:hover {
                    background: ${isDark ? '#20263A' : '#F4EBDD'};
                    border-color: ${isDark ? '#E6BC6B' : '#C99A45'};
                    transform: rotate(15deg) scale(1.08);
                }
            `}</style>

            <Helmet>
                <title>{seoTitle}</title>
                <meta name="description" content={seoDesc} />
                {post.seo?.keywords && post.seo.keywords.length > 0 && (
                    <meta name="keywords" content={post.seo.keywords.join(', ')} />
                )}
                <link rel="canonical" href={canonicalUrl} />
                
                <meta property="og:title" content={seoTitle} />
                <meta property="og:description" content={seoDesc} />
                <meta property="og:image" content={coverUrl} />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:type" content="article" />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={seoTitle} />
                <meta name="twitter:description" content={seoDesc} />
                <meta name="twitter:image" content={coverUrl} />

                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>

            {/* Theme Toggle Button - Fixed top right */}
            <button
                onClick={toggleTheme}
                className="blog-details-theme-toggle"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Reading Progress Bar */}
            <div className="fixed top-0 left-0 w-full z-50" style={{ height: '3px', background: t.progressBg }}>
                <div 
                    className="h-full transition-all duration-75"
                    style={{ width: `${scrollProgress}%`, background: t.progressBar }}
                />
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="mb-6 flex justify-start">
                    <Link 
                        to="/blog" 
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors duration-200"
                        style={{ color: t.mutedText }}
                    >
                        <ArrowLeft size={12} /> Back to Articles
                    </Link>
                </div>

                {/* HD Cover Image - Up/Top (Bounded inside max-w-7xl) */}
                <div className="max-w-4xl mx-auto w-full h-auto mb-12 relative z-0" style={{ borderRadius: '2.5rem', overflow: 'hidden', border: `1px solid ${t.cardBorder}`, boxShadow: isDark ? '0 25px 50px rgba(0,0,0,0.4)' : '0 25px 50px rgba(0,0,0,0.15)' }}>
                    {post.coverImage ? (
                        <>
                            <img src={post.coverImage} alt={post.title} loading="lazy" decoding="async" crossOrigin="anonymous" referrerPolicy="no-referrer" className="w-full h-auto block" onError={(e) => { e.target.style.display = 'none'; if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex'; }} />
                            <div className="w-full items-center justify-center" style={{ display: 'none', height: '250px', background: isDark ? 'linear-gradient(135deg, #151928, #20263A)' : 'linear-gradient(135deg, #20263A, #2E3852)', color: 'rgba(255,255,255,0.05)' }}>
                                <BookOpen size={96} />
                            </div>
                        </>
                    ) : (
                        <div className="w-full flex items-center justify-center" style={{ height: '250px', background: isDark ? 'linear-gradient(135deg, #151928, #20263A)' : 'linear-gradient(135deg, #20263A, #2E3852)', color: 'rgba(255,255,255,0.05)' }}>
                            <BookOpen size={96} />
                        </div>
                    )}
                </div>

                {/* Overlapping White Box Header */}
                <div className="relative z-10 -mt-24 md:-mt-36 max-w-4xl mx-auto px-6 mb-16">
                    <div className="text-center space-y-6" style={{ background: t.headerBg, border: `1px solid ${t.headerBorder}`, borderRadius: '2rem', boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.3)' : '0 20px 40px rgba(0,0,0,0.08)', padding: '2rem 3rem' }}>
                        
                        {/* 1. Category Badge */}
                        <div>
                            <span style={{ 
                                display: 'inline-block', 
                                padding: '8px 18px', 
                                borderRadius: '9999px', 
                                background: t.badgeBg, 
                                color: t.badgeText, 
                                border: `1px solid ${t.badgeBorder}`,
                                fontSize: '11px', 
                                fontWeight: 700, 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.08em', 
                                boxShadow: isDark ? 'none' : '0 1px 3px rgba(201,154,69,0.1)' 
                            }}>
                                {categoryLabel}
                            </span>
                        </div>

                        {/* 2. Title */}
                        <h1 className="select-text" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.625rem)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.15, color: t.headingText, maxWidth: '48rem', margin: '0 auto' }}>
                            {post.title}
                        </h1>

                        {/* 3. Subtitle (Short description) */}
                        {post.subtitle && (
                            <p style={{ color: t.subText, fontSize: 'clamp(0.9rem, 2vw, 1.125rem)', fontWeight: 400, lineHeight: 1.6, maxWidth: '42rem', margin: '0 auto' }}>
                                {post.subtitle}
                            </p>
                        )}

                        {/* 4. Team Hire1Percent / Author metadata row at the bottom of the card */}
                        <div className="flex flex-col items-center justify-center gap-4 pt-6" style={{ borderTop: `1px solid ${isDark ? '#232B40' : '#E3E5EC'}` }}>
                            
                            {/* Author avatar & designation */}
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 transition-transform"
                                    style={{ 
                                        background: isDark ? '#151928' : '#F8F8FA',
                                        border: `1px solid ${isDark ? '#232B40' : '#E3E5EC'}`,
                                        boxShadow: isDark ? '0 4px 12px rgba(201,154,69,0.12)' : '0 2px 6px rgba(0,0,0,0.06)'
                                    }}
                                >
                                    <img 
                                        src="/logo-icon.webp" 
                                        alt="Hire1Percent" 
                                        width="36"
                                        height="36"
                                        onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', transform: 'scale(1.1)' }}
                                    />
                                </div>
                                <div className="text-left">
                                    <p style={{ fontSize: '12px', fontWeight: 900, color: t.headingText, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>Hire1Percent Team</p>
                                    <p style={{ fontSize: '9px', color: t.mutedText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Editorial board</p>
                                </div>
                            </div>
                            
                            {/* Date, Reading Time, and Share buttons */}
                            <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                                <div className="flex items-center gap-4 font-mono" style={{ fontSize: '10px', color: t.mutedText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    <span className="flex items-center gap-1.5"><Calendar size={11} /> {new Date(post.publishedAt || post.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                                    <span className="flex items-center gap-1.5"><Clock size={11} /> {calculateReadTime(post.content)}</span>
                                </div>
                                <span className="hidden sm:inline" style={{ color: isDark ? '#232B40' : '#E3E5EC' }}>|</span>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={copyLinkToClipboard}
                                        className="p-2 rounded-full border transition-all duration-200 cursor-pointer"
                                        style={{
                                            background: copied ? t.copiedBg : t.btnBg,
                                            borderColor: copied ? t.copiedBorder : t.btnBorder,
                                            color: copied ? t.copiedText : t.btnText,
                                        }}
                                        title="Copy Link"
                                    >
                                        {copied ? <span style={{ fontSize: '9px', fontWeight: 700, padding: '0 4px' }}>Copied!</span> : <Share2 size={13} />}
                                    </button>
                                    <button 
                                        onClick={shareOnLinkedIn}
                                        className="p-2 rounded-full border transition-colors cursor-pointer"
                                        style={{ background: t.btnBg, borderColor: t.btnBorder, color: t.btnText }}
                                        title="Share on LinkedIn"
                                    >
                                        <Linkedin size={13} />
                                    </button>
                                    <button 
                                        onClick={shareOnTwitter}
                                        className="p-2 rounded-full border transition-colors cursor-pointer"
                                        style={{ background: t.btnBg, borderColor: t.btnBorder, color: t.btnText }}
                                        title="Share on Twitter"
                                    >
                                        <Twitter size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 2-Column Responsive Layout (Main Content + Sticky TOC) - Left-aligned main content, right side TOC spacer */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
                    
                    {/* Left Column: Main Content (Left aligned, no large left spacer, just container padding) */}
                    <div className="w-full max-w-[850px]">
                        
                        {/* Tablet Collapsible TOC (hidden on desktop and mobile) */}
                        {toc.length > 0 && (
                            <div className="hidden md:block lg:hidden mb-8 p-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <TableOfContents 
                                    items={toc}
                                    activeId={activeTocId}
                                    onItemClick={handleTocClick}
                                    collapsed={tabletTocCollapsed}
                                    onToggle={() => setTabletTocCollapsed(!tabletTocCollapsed)}
                                    isDark={isDark}
                                />
                            </div>
                        )}

                        <article ref={articleRef} className="w-full">
                            {parsedBlocks.map((block, index) => renderBlock(block, index, isDark))}
                        </article>
                    </div>

                    {/* Right Column: Table of Contents (Sticky on Desktop) */}
                    <div className="hidden lg:block w-[280px]">
                        <div className="sticky top-[100px] h-fit">
                            <TableOfContents 
                                items={toc}
                                activeId={activeTocId}
                                onItemClick={handleTocClick}
                                collapsed={false}
                                isDark={isDark}
                            />
                        </div>
                    </div>

                </div> {/* end of grid */}

                {/* CTA Section (Spans full page width, centered, cards share space equally left/right) */}
                <div className="mt-24 mb-24 pt-20" style={{ borderTop: `1px solid ${t.cardBorder}` }}>
                    {/* Section Title & Subtitle */}
                    <div className="max-w-[700px] mx-auto text-center mb-16 space-y-4">
                        <h2 className="tracking-tight leading-tight" style={{ fontSize: 'clamp(1.875rem, 4vw, 2.625rem)', fontWeight: 700, color: t.headingText }}>
                            Ready to Take the Next Step?
                        </h2>
                        <p style={{ color: t.subText, fontSize: 'clamp(0.9rem, 2vw, 1.125rem)', lineHeight: 1.6 }}>
                            Whether you're building an engineering team or building your career, Hire1Percent helps you move forward with confidence.
                        </p>
                    </div>

                    {/* Cards Layout - Desktop: 2 equal cards, Tablet: 2 cards, Mobile: stacked */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                        
                        {/* Recruiter Card */}
                        <div className="group flex flex-col justify-between relative overflow-hidden" style={{ background: t.ctaGradient, color: t.ctaText, border: `1px solid ${isDark ? '#232B40' : 'rgba(201,154,69,0.25)'}`, borderRadius: '2rem', padding: '2.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'all 0.3s ease' }}>
                            {/* Soft Glow */}
                            <div style={{ position: 'absolute', top: 0, right: 0, width: '220px', height: '220px', background: 'rgba(201,154,69,0.08)', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }}></div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '220px', height: '220px', background: 'rgba(201,154,69,0.05)', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }}></div>
                            
                            <div className="relative z-10 space-y-5">
                                <div>
                                    <span style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(201,154,69,0.15)', color: '#E6BC6B', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', borderRadius: '9999px', border: '1px solid rgba(201,154,69,0.3)' }}>
                                        HIRE1PERCENT
                                    </span>
                                </div>
                                <h3 style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.625rem)', lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
                                    Build High-Performing Engineering Teams with Confidence
                                </h3>
                                <p style={{ color: '#CBD5E1', fontSize: 'clamp(0.85rem, 1.5vw, 1rem)', lineHeight: 1.6 }}>
                                    Hire1Percent helps growing companies make confident technical hiring decisions, reduce recruitment friction, and identify exceptional engineering talent through a structured hiring experience designed for modern teams.
                                </p>
                            </div>
                            
                            <div className="relative z-10 pt-6">
                                <Link 
                                    to="/?book-calibration=true" 
                                    className="inline-flex items-center gap-2 font-bold rounded-full px-7 py-3.5 transition-all duration-200 cursor-pointer group/btn"
                                    style={{ background: '#C99A45', color: '#20263A', fontSize: '0.95rem', boxShadow: '0 4px 14px rgba(201,154,69,0.3)' }}
                                    aria-label="Book a Demo for Recruiters"
                                >
                                    <span>Book a Demo</span>
                                    <ArrowRight size={16} className="group-hover/btn:translate-x-1.5 transition-transform duration-300" />
                                </Link>
                            </div>
                        </div>

                        {/* Candidate Card */}
                        <div className="group flex flex-col justify-between relative overflow-hidden" style={{ background: t.ctaGradient, color: t.ctaText, border: `1px solid ${isDark ? '#232B40' : 'rgba(201,154,69,0.25)'}`, borderRadius: '2rem', padding: '2.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'all 0.3s ease' }}>
                            {/* Soft Glow */}
                            <div style={{ position: 'absolute', top: 0, right: 0, width: '220px', height: '220px', background: 'rgba(201,154,69,0.08)', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }}></div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '220px', height: '220px', background: 'rgba(201,154,69,0.05)', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }}></div>
                            
                            <div className="relative z-10 space-y-5">
                                <div>
                                    <span style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(201,154,69,0.15)', color: '#E6BC6B', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', borderRadius: '9999px', border: '1px solid rgba(201,154,69,0.3)' }}>
                                        HIRE1PERCENT
                                    </span>
                                </div>
                                <h3 style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.625rem)', lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
                                    Turn Your Skills Into Your Biggest Advantage
                                </h3>
                                <p style={{ color: '#CBD5E1', fontSize: 'clamp(0.85rem, 1.5vw, 1rem)', lineHeight: 1.6 }}>
                                    Join Hire1Percent to showcase your technical abilities, connect with leading companies, and discover opportunities where your skills matter more than your résumé.
                                </p>
                            </div>
                            
                            <div className="relative z-10 pt-6">
                                <Link 
                                    to="/signup?role=candidate" 
                                    state={{ role: 'candidate' }}
                                    className="inline-flex items-center gap-2 font-bold rounded-full px-7 py-3.5 transition-all duration-200 cursor-pointer group/btn"
                                    style={{ background: '#C99A45', color: '#20263A', fontSize: '0.95rem', boxShadow: '0 4px 14px rgba(201,154,69,0.3)' }}
                                    aria-label="Get Started for Candidates"
                                >
                                    <span>Get Started</span>
                                    <ArrowRight size={16} className="group-hover/btn:translate-x-1.5 transition-transform duration-305" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Related Articles (Full width of page container, below CTA) */}
                {related.length > 0 && (
                    <div className="space-y-8 pt-16 mt-16" style={{ borderTop: `1px solid ${t.cardBorder}` }}>
                        <div className="flex items-center gap-2">
                            <BookOpen size={18} style={{ color: t.accentText }} />
                            <h3 className="text-xl font-extrabold" style={{ color: t.headingText }}>Related Articles</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {related.map(relPost => {
                                const relCategorySlug = typeof relPost.category === 'object' ? relPost.category?.slug : relPost.category;
                                const relCategory = CATEGORY_MAP[relCategorySlug] || (typeof relPost.category === 'object' ? relPost.category?.name : relPost.category) || 'Insights';
                                return (
                                    <Link 
                                        to={`/blog/${relPost.slug}`} 
                                        key={relPost._id} 
                                        className="group flex flex-col justify-between transition-all duration-300"
                                        style={{ height: '360px', borderRadius: '1.5rem', border: `1px solid ${t.relCardBorder}`, background: t.relCardBg, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                                    >
                                        <div>
                                            <div className="overflow-hidden relative" style={{ height: '160px', borderRadius: '1rem', border: `1px solid ${isDark ? '#232B40' : '#E3E5EC'}`, background: isDark ? '#151928' : '#F8F8FA' }}>
                                                {relPost.coverImage ? (
                                                    <>
                                                        <img src={relPost.coverImage} alt={relPost.title} loading="lazy" decoding="async" crossOrigin="anonymous" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex'; }} />
                                                        <div className="w-full h-full items-center justify-center" style={{ display: 'none', background: isDark ? '#151928' : '#F8F8FA', color: t.mutedText }}>
                                                            <BookOpen size={24} />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center" style={{ background: isDark ? '#151928' : '#F8F8FA', color: t.mutedText }}>
                                                        <BookOpen size={24} />
                                                    </div>
                                                )}
                                                <span style={{ position: 'absolute', top: '12px', left: '12px', padding: '4px 10px', borderRadius: '9999px', background: 'rgba(32,38,58,0.85)', color: '#E6BC6B', border: '1px solid rgba(201,154,69,0.3)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', backdropFilter: 'blur(4px)' }}>
                                                    {relCategory}
                                                </span>
                                            </div>
                                            <div className="mt-4 space-y-1.5">
                                                <p className="font-mono" style={{ fontSize: '9px', fontWeight: 700, color: t.mutedText, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                    {new Date(relPost.publishedAt || relPost.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                                                </p>
                                                <h4 className="group-hover:!text-[#C99A45] line-clamp-2 transition-colors duration-200" style={{ fontSize: '0.875rem', fontWeight: 800, color: t.headingText }}>
                                                    {relPost.title}
                                                </h4>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 mt-3" style={{ borderTop: `1px solid ${isDark ? '#232B40' : '#E3E5EC'}` }}>
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center shrink-0"
                                                    style={{ 
                                                        background: isDark ? '#151928' : '#F8F8FA',
                                                        border: `1px solid ${isDark ? '#232B40' : '#E3E5EC'}`
                                                    }}
                                                >
                                                    <img 
                                                        src="/logo-icon.webp" 
                                                        alt="Hire1Percent" 
                                                        onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', transform: 'scale(1.1)' }}
                                                    />
                                                </div>
                                                <span className="truncate max-w-[120px]" style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#CBD5E1' : '#252A3D' }}>Hire1Percent Team</span>
                                            </div>
                                            <ArrowRight size={14} style={{ color: t.accentText }} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile contents floating button and modal */}
            {toc.length > 0 && (
                <div className="md:hidden">
                    <button 
                        onClick={() => setMobileTocOpen(true)}
                        className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg p-4 flex items-center gap-2 transition-all duration-300 font-bold uppercase tracking-wider text-xs cursor-pointer"
                        style={{ background: '#20263A', color: '#E6BC6B', border: '1px solid #C99A45', boxShadow: '0 4px 14px rgba(32,38,58,0.25)' }}
                    >
                        <BookOpen size={16} />
                        <span>Contents</span>
                    </button>
                    
                    {mobileTocOpen && (
                        <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
                            <div 
                                className="absolute inset-0 backdrop-blur-sm transition-opacity duration-300"
                                style={{ background: t.overlayBg }}
                                onClick={() => setMobileTocOpen(false)}
                            />
                            <div className="relative w-full max-w-lg z-10 overflow-hidden flex flex-col transition-transform duration-300 transform translate-y-0" style={{ background: t.mobileTocBg, borderRadius: '2.5rem 2.5rem 0 0', padding: '1.5rem', boxShadow: isDark ? '0 -10px 40px rgba(0,0,0,0.5)' : '0 -10px 40px rgba(0,0,0,0.1)', border: `1px solid ${t.mobileTocBorder}`, maxHeight: '80vh' }}>
                                <div style={{ width: '48px', height: '6px', background: isDark ? '#232B40' : '#E3E5EC', borderRadius: '9999px', margin: '0 auto 1.25rem' }}></div>
                                
                                <div className="flex justify-between items-center pb-4 mb-4 shrink-0 font-sans" style={{ borderBottom: `1px solid ${t.mobileTocBorder}` }}>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 900, color: t.headingText, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Table of Contents</h3>
                                    <button 
                                        onClick={() => setMobileTocOpen(false)}
                                        style={{ fontSize: '0.75rem', color: t.mutedText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', background: 'none', border: 'none' }}
                                    >
                                        Close
                                    </button>
                                </div>
                                
                                <div className="overflow-y-auto pb-8">
                                    <TableOfContents 
                                        items={toc}
                                        activeId={activeTocId}
                                        onItemClick={(id) => {
                                            handleTocClick(id);
                                            setMobileTocOpen(false);
                                        }}
                                        collapsed={false}
                                        isDark={isDark}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

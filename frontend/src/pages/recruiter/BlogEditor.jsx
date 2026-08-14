import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Cropper from 'react-easy-crop';
import {
    Save, Eye, Send, Loader2, Clock, FileText, ChevronDown,
    Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3,
    List, ListOrdered, CheckSquare, Quote, Code, Minus, Link as LinkIcon,
    Image as ImageIcon, Video, Table as TableIcon, AlignLeft, AlignCenter,
    AlignRight, Highlighter, Crop, Trash2, Upload, X, Monitor, Tablet,
    Smartphone, AlertTriangle, Calendar, User, BookOpen, ArrowLeft,
    RotateCcw, Type, Sparkles, Hash, Search, Globe, ExternalLink, MousePointer
} from 'lucide-react';
import {
    createBlogPost, updateBlogPost, getBlogPostById,
    uploadBlogImage, getFeaturedPost
} from '../../services/blogService';
import './BlogEditor.css';

/* ═══════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════ */
const CATEGORIES = [
    { value: '', label: 'Select Category...' },
    { value: 'technical-assessments', label: 'Technical Assessments' },
    { value: 'ai-hiring', label: 'AI Hiring' },
    { value: 'engineering-hiring', label: 'Engineering Hiring' },
    { value: 'product-updates', label: 'Product Updates' },
];

const DEFAULT_TAGS = [
    'AI Hiring', 'Resume Screening', 'Assessment', 'ATS',
    'Recruitment', 'Developer Hiring', 'Automation', 'LLM'
];

const CTA_TYPES = [
    { value: 'none', label: 'None' },
    { value: 'book-demo', label: 'Book Demo' },
    { value: 'contact-sales', label: 'Contact Sales' },
    { value: 'learn-more', label: 'Learn More' },
];

const AUTO_SAVE_INTERVAL = 10000; // 10 seconds
const META_TITLE_MAX = 60;
const META_DESC_MAX = 160;

/* ═══════════════════════════════════════════════════════════
   Utility Helpers
   ═══════════════════════════════════════════════════════════ */
const slugify = (text) => {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 120);
};

const calculateReadingTime = (html) => {
    if (!html) return '0 min read';
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text.split(' ').filter(w => w.length > 0).length;
    const minutes = Math.max(1, Math.ceil(words / 225));
    return `${minutes} min read`;
};

const countWords = (html) => {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.split(' ').filter(w => w.length > 0).length;
};

const extractTOCFromHTML = (html) => {
    if (!html) return [];
    const headings = [];
    const regex = /<(h[23])[^>]*>(.*?)<\/\1>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        const level = parseInt(match[1][1]);
        const text = match[2].replace(/<[^>]*>/g, '').trim();
        const id = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
        headings.push({ level, text, id });
    }
    return headings;
};

// Create cropped image from canvas
const getCroppedImg = (imageSrc, crop) => {
    return new Promise((resolve) => {
        const image = new window.Image();
        image.crossOrigin = 'anonymous';
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = crop.width;
            canvas.height = crop.height;
            ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    resolve({ blob, url });
                }
            }, 'image/jpeg', 0.92);
        };
    });
};

/* ═══════════════════════════════════════════════════════════
   TipTap Toolbar Component
   ═══════════════════════════════════════════════════════════ */
const EditorToolbar = ({ editor }) => {
    if (!editor) return null;

    const addImage = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // Try to upload to backend first, fall back to data URL
            try {
                const result = await uploadBlogImage(file);
                if (result?.url) {
                    editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
                    return;
                }
            } catch (err) {
                console.warn('Image upload failed, using local data URL:', err);
            }

            // Fallback: data URL
            const reader = new FileReader();
            reader.onload = () => {
                editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run();
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const addLink = () => {
        const url = window.prompt('Enter URL:');
        if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
        }
    };

    const addVideo = () => {
        const url = window.prompt('Enter YouTube or Vimeo URL:');
        if (url) {
            editor.commands.setYoutubeVideo({ src: url });
        }
    };

    const addTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };

    const ToolBtn = ({ onClick, active, title, children }) => (
        <button
            type="button"
            onClick={onClick}
            className={`blog-tiptap-btn ${active ? 'active' : ''}`}
            title={title}
        >
            {children}
        </button>
    );

    return (
        <div className="blog-tiptap-toolbar">
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
                <Heading1 />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
                <Heading2 />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
                <Heading3 />
            </ToolBtn>

            <div className="divider" />

            <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
                <Bold />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
                <Italic />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
                <UnderlineIcon />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">
                <Highlighter />
            </ToolBtn>

            <div className="divider" />

            <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
                <List />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
                <ListOrdered />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist">
                <CheckSquare />
            </ToolBtn>

            <div className="divider" />

            <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
                <Quote />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block">
                <Code />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
                <Minus />
            </ToolBtn>

            <div className="divider" />

            <ToolBtn onClick={addLink} active={editor.isActive('link')} title="Link">
                <LinkIcon />
            </ToolBtn>
            <ToolBtn onClick={addImage} title="Insert Image">
                <ImageIcon />
            </ToolBtn>
            <ToolBtn onClick={addVideo} title="Embed Video">
                <Video />
            </ToolBtn>
            <ToolBtn onClick={addTable} title="Insert Table">
                <TableIcon />
            </ToolBtn>

            <div className="divider" />

            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
                <AlignLeft />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
                <AlignCenter />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
                <AlignRight />
            </ToolBtn>

            <div className="divider" />

            <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
                <RotateCcw />
            </ToolBtn>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   Live Preview Component
   ═══════════════════════════════════════════════════════════ */
const LivePreview = ({ formData, editorHTML, previewMode, setPreviewMode, onClose, isMobileModal = false }) => {
    const toc = useMemo(() => extractTOCFromHTML(editorHTML), [editorHTML]);
    const readTime = useMemo(() => calculateReadingTime(editorHTML), [editorHTML]);

    const Wrapper = isMobileModal ? 'div' : React.Fragment;
    const wrapperProps = isMobileModal ? { className: 'blog-mobile-preview-body' } : {};

    const categoryLabel = CATEGORIES.find(c => c.value === formData.category)?.label || '';

    return (
        <>
            {!isMobileModal && (
                <div className="blog-preview-header">
                    <h4>Live Preview</h4>
                    <div className="blog-preview-modes">
                        {[
                            { key: 'desktop', icon: <Monitor size={12} />, label: 'Desktop' },
                            { key: 'tablet', icon: <Tablet size={12} />, label: 'Tablet' },
                            { key: 'mobile', icon: <Smartphone size={12} />, label: 'Mobile' },
                        ].map(m => (
                            <button
                                key={m.key}
                                type="button"
                                className={`blog-preview-mode-btn ${previewMode === m.key ? 'active' : ''}`}
                                onClick={() => setPreviewMode(m.key)}
                            >
                                {m.icon}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <Wrapper {...wrapperProps}>
                <div className="blog-preview-content">
                    <div className={`blog-preview-frame ${previewMode}`}>
                        <div className="blog-preview-article">
                            {/* Premium Full-Width Cover Image Banner (No overlay text) */}
                            <div className="relative w-full h-[200px] overflow-hidden bg-slate-100">
                                {formData.coverImagePreview ? (
                                    <img src={formData.coverImagePreview} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-indigo-950" />
                                )}
                            </div>

                            {/* Overlapping Header Card */}
                            <div className="relative z-10 -mt-10 px-4">
                                <div className="bg-white border border-slate-100 rounded-2xl shadow-md p-6 text-center space-y-4">
                                    <div>
                                        <span className="inline-block px-2.5 py-1 rounded bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest">
                                            {categoryLabel || 'Insights'}
                                        </span>
                                    </div>

                                    <h2 className="text-slate-900 text-base md:text-lg font-extrabold leading-tight tracking-tight">
                                        {formData.title || 'Untitled Article'}
                                    </h2>

                                    {formData.subtitle && (
                                        <p className="text-slate-500 text-xs font-normal line-clamp-2">
                                            {formData.subtitle}
                                        </p>
                                    )}

                                    {/* Metadata */}
                                    <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                        <span>By Hire1Percent Team</span>
                                        <span className="text-slate-200">|</span>
                                        <span>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        <span className="text-slate-200">|</span>
                                        <span>{readTime}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="preview-body" style={{ padding: '20px 24px' }}>
                                {/* Table of Contents */}
                                {toc.length > 0 && (
                                    <div className="blog-preview-toc">
                                        <h5>Table of Contents</h5>
                                        <ul>
                                            {toc.map((item, i) => (
                                                <li key={i} style={{ paddingLeft: `${(item.level - 2) * 14}px` }}>
                                                    <a href={`#${item.id}`}>{item.text}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Article Content */}
                                {editorHTML && (
                                    <div className="preview-content" dangerouslySetInnerHTML={{ __html: editorHTML }} />
                                )}


                            </div>
                        </div>
                    </div>
                </div>
            </Wrapper>
        </>
    );
};

/* ═══════════════════════════════════════════════════════════
   Main BlogEditor Component
   ═══════════════════════════════════════════════════════════ */
export default function BlogEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    // ─── Form State ─────────────────────────────────────────
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        slug: '',
        slugManual: false,
        category: '',
        tags: [],
        coverImage: null,
        coverImagePreview: '',
        coverAltText: '',
        coverCaption: '',
        status: 'draft',
        scheduledDate: '',
        scheduledTime: '',
        isFeatured: false,
        seoTitle: '',
        seoDescription: '',
        seoKeywords: '',
        ogImage: null,
        ogImagePreview: '',
        canonicalUrl: '',
        ctaType: 'none',
        ctaHeading: '',
        ctaDescription: '',
        ctaButtonText: '',
        ctaButtonLink: '',
    });

    // ─── UI State ───────────────────────────────────────────
    const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [loading, setLoading] = useState(isEditing);
    const [publishing, setPublishing] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewMode, setPreviewMode] = useState('desktop');
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropImage, setCropImage] = useState('');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [tagInput, setTagInput] = useState('');
    const [existingFeatured, setExistingFeatured] = useState(null);
    const [postId, setPostId] = useState(id || null);

    const dirtyRef = useRef(false);
    const autoSaveTimerRef = useRef(null);
    const fileInputRef = useRef(null);
    const ogFileInputRef = useRef(null);

    // ─── TipTap Editor ──────────────────────────────────────
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                codeBlock: false,
            }),
            Image.configure({ inline: false, allowBase64: true }),
            Link.configure({ openOnClick: false, autolink: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            Underline,
            TaskList,
            TaskItem.configure({ nested: true }),
            Placeholder.configure({ placeholder: 'Start writing your article... Use markdown shortcuts like # for headings, > for quotes, ``` for code blocks...' }),
            Youtube.configure({ width: 640, height: 360 }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Highlight,
            HorizontalRule,
        ],
        content: '',
        onUpdate: () => {
            dirtyRef.current = true;
        },
    });

    const editorHTML = editor?.getHTML() || '';

    // ─── Load existing post if editing ──────────────────────
    useEffect(() => {
        if (isEditing && id) {
            (async () => {
                setLoading(true);
                try {
                    const result = await getBlogPostById(id);
                    if (result?.post || result) {
                        const post = result.post || result;
                        setFormData(prev => ({
                            ...prev,
                            title: post.title || '',
                            subtitle: post.subtitle || '',
                            slug: post.slug || '',
                            slugManual: true,
                            category: post.category?.slug || post.category || '',
                            tags: post.tags || [],
                            coverImagePreview: post.coverImage || '',
                            coverAltText: post.coverAltText || '',
                            coverCaption: post.coverCaption || '',
                            status: post.status || 'draft',
                            scheduledDate: post.scheduledAt ? new Date(post.scheduledAt).toISOString().split('T')[0] : '',
                            scheduledTime: post.scheduledAt ? new Date(post.scheduledAt).toTimeString().slice(0, 5) : '',
                            isFeatured: post.isFeatured || false,
                            seoTitle: post.seo?.metaTitle || '',
                            seoDescription: post.seo?.metaDescription || '',
                            seoKeywords: post.seo?.keywords?.join(', ') || '',
                            ogImagePreview: post.seo?.ogImage || '',
                            canonicalUrl: post.seo?.canonicalUrl || '',
                            ctaType: post.cta?.type || 'none',
                            ctaHeading: post.cta?.heading || '',
                            ctaDescription: post.cta?.description || '',
                            ctaButtonText: post.cta?.buttonText || '',
                            ctaButtonLink: post.cta?.buttonLink || '',
                        }));
                        if (editor && post.content) {
                            editor.commands.setContent(post.content);
                        }
                        setPostId(post._id);
                    }
                } catch (err) {
                    console.error('Failed to load blog post:', err);
                } finally {
                    setLoading(false);
                }
            })();
        }
    }, [isEditing, id]);

    // Set content when editor is ready (for editing mode)
    useEffect(() => {
        if (editor && isEditing && loading === false) {
            // Content was already set in the load effect
        }
    }, [editor, isEditing, loading]);

    // ─── Check featured post ────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await getFeaturedPost();
                if (res?.post) {
                    setExistingFeatured(res.post);
                }
            } catch (err) {
                // Not critical
            }
        })();
    }, []);

    // ─── Auto-generate slug from title ──────────────────────
    useEffect(() => {
        if (!formData.slugManual && formData.title) {
            setFormData(prev => ({ ...prev, slug: slugify(formData.title) }));
        }
    }, [formData.title, formData.slugManual]);

    // ─── Auto-save ──────────────────────────────────────────
    useEffect(() => {
        autoSaveTimerRef.current = setInterval(() => {
            if (dirtyRef.current && formData.title.trim()) {
                handleSave(true);
            }
        }, AUTO_SAVE_INTERVAL);

        return () => clearInterval(autoSaveTimerRef.current);
    }, [formData, postId]);

    // ─── Form Handlers ──────────────────────────────────────
    const updateField = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        dirtyRef.current = true;
    }, []);

    // ─── Cover Image Handlers ───────────────────────────────
    const handleCoverUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            updateField('coverImage', file);
            updateField('coverImagePreview', reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleCoverDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            updateField('coverImage', file);
            updateField('coverImagePreview', reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = useCallback((_, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const applyCrop = async () => {
        if (!croppedAreaPixels || !cropImage) return;
        try {
            const { url } = await getCroppedImg(cropImage, croppedAreaPixels);
            updateField('coverImagePreview', url);
            setShowCropModal(false);
        } catch (err) {
            console.error('Crop failed:', err);
        }
    };

    const openCropModal = () => {
        if (formData.coverImagePreview) {
            setCropImage(formData.coverImagePreview);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setShowCropModal(true);
        }
    };

    // ─── OG Image Handler ───────────────────────────────────
    const handleOGImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            updateField('ogImage', file);
            updateField('ogImagePreview', reader.result);
        };
        reader.readAsDataURL(file);
    };

    // ─── Tag Handlers ───────────────────────────────────────
    const addTag = (tag) => {
        const trimmed = tag.trim();
        if (trimmed && !formData.tags.includes(trimmed)) {
            updateField('tags', [...formData.tags, trimmed]);
        }
        setTagInput('');
    };

    const removeTag = (tag) => {
        updateField('tags', formData.tags.filter(t => t !== tag));
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (tagInput.trim()) addTag(tagInput);
        } else if (e.key === 'Backspace' && !tagInput && formData.tags.length > 0) {
            removeTag(formData.tags[formData.tags.length - 1]);
        }
    };

    // ─── Build Payload ──────────────────────────────────────
    const buildPayload = useCallback(() => {
        const html = editor?.getHTML() || '';
        const payload = {
            title: formData.title,
            subtitle: formData.subtitle,
            slug: formData.slug,
            category: formData.category,
            tags: formData.tags,
            content: html,
            coverImage: formData.coverImagePreview,
            coverAltText: formData.coverAltText,
            coverCaption: formData.coverCaption,
            status: formData.status,
            isFeatured: formData.isFeatured,
            seo: {
                metaTitle: formData.seoTitle,
                metaDescription: formData.seoDescription,
                keywords: formData.seoKeywords.split(',').map(k => k.trim()).filter(Boolean),
                ogImage: formData.ogImagePreview || formData.coverImagePreview,
                canonicalUrl: formData.canonicalUrl,
            },
            cta: {
                type: formData.ctaType,
                heading: formData.ctaHeading,
                description: formData.ctaDescription,
                buttonText: formData.ctaButtonText,
                buttonLink: formData.ctaButtonLink,
            },
            authorName: 'Hire1Percent Team',
        };

        if (formData.status === 'scheduled' && formData.scheduledDate) {
            payload.scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime || '00:00'}`).toISOString();
        }

        return payload;
    }, [formData, editor]);

    // ─── Save Handler ───────────────────────────────────────
    const handleSave = useCallback(async (isAutoSave = false) => {
        if (!formData.title.trim()) return;

        setSaveStatus('saving');
        try {
            const payload = buildPayload();
            if (isAutoSave) payload.status = payload.status === 'published' ? 'published' : 'draft';

            let result;
            if (postId) {
                result = await updateBlogPost(postId, payload);
            } else {
                payload.status = 'draft';
                result = await createBlogPost(payload);
                if (result?.post?._id || result?._id) {
                    setPostId(result.post?._id || result._id);
                }
            }

            dirtyRef.current = false;
            setSaveStatus('saved');
            setLastSavedAt(new Date());
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
            console.error('Save failed:', err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 4000);
        }
    }, [formData, postId, buildPayload]);

    // ─── Publish Handler ────────────────────────────────────
    const handlePublish = async () => {
        setPublishing(true);
        try {
            const payload = buildPayload();
            payload.status = formData.status === 'scheduled' ? 'scheduled' : 'published';
            payload.publishedAt = formData.status === 'scheduled'
                ? new Date(`${formData.scheduledDate}T${formData.scheduledTime || '00:00'}`).toISOString()
                : new Date().toISOString();

            let result;
            if (postId) {
                result = await updateBlogPost(postId, payload);
            } else {
                result = await createBlogPost(payload);
                if (result?.post?._id || result?._id) {
                    setPostId(result.post?._id || result._id);
                }
            }

            dirtyRef.current = false;
            setSaveStatus('saved');
            setLastSavedAt(new Date());
            setTimeout(() => {
                navigate('/recruiter/blog');
            }, 1000);
        } catch (err) {
            console.error('Publish failed:', err);
            setSaveStatus('error');
        } finally {
            setPublishing(false);
        }
    };

    // ─── Validation Warnings ────────────────────────────────
    const warnings = useMemo(() => {
        const w = [];
        if (!formData.title.trim()) w.push('Title is required');
        if (!formData.subtitle.trim()) w.push('Subtitle / excerpt is required');
        if (!formData.category) w.push('Category not selected');
        if (!formData.coverImagePreview) w.push('Cover image is missing');
        if (formData.coverImagePreview && !formData.coverAltText.trim()) w.push('Cover image alt text is missing');
        if (!editorHTML || editorHTML === '<p></p>') w.push('Article content is empty');
        if (formData.seoTitle && formData.seoTitle.length > META_TITLE_MAX) w.push(`Meta title exceeds ${META_TITLE_MAX} characters`);
        if (formData.seoDescription && formData.seoDescription.length > META_DESC_MAX) w.push(`Meta description exceeds ${META_DESC_MAX} characters`);
        return w;
    }, [formData, editorHTML]);

    // SEO meter helpers
    const seoTitlePercent = formData.seoTitle ? Math.min(100, (formData.seoTitle.length / META_TITLE_MAX) * 100) : 0;
    const seoDescPercent = formData.seoDescription ? Math.min(100, (formData.seoDescription.length / META_DESC_MAX) * 100) : 0;
    const seoMeterClass = (pct) => pct > 100 ? 'danger' : pct > 85 ? 'warning' : 'good';

    // ─── Loading State ──────────────────────────────────────
    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '10px', color: '#94a3b8' }}>
                <Loader2 size={20} className="animate-spin" />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Loading editor...</span>
            </div>
        );
    }

    return (
        <div className="blog-editor-wrapper">
            {/* ═══ Left Panel: Editor ═══════════════════════════ */}
            <div className="blog-editor-main">

                {/* ─── Sticky Action Bar ─────────────────────── */}
                <div className="blog-action-bar">
                    <div className="blog-action-bar-left">
                        <button type="button" className="blog-btn blog-btn-ghost" onClick={() => navigate('/recruiter/blog')} title="Back">
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                                {isEditing ? 'Edit Article' : 'New Article'}
                            </span>
                            <div className={`save-status ${saveStatus}`}>
                                {saveStatus === 'saving' && <><Loader2 size={10} className="animate-spin" /> Auto Saving...</>}
                                {saveStatus === 'saved' && <><span style={{ color: '#10b981' }}>✓</span> Draft Saved</>}
                                {saveStatus === 'error' && <><span style={{ color: '#ef4444' }}>✕</span> Save Failed</>}
                                {saveStatus === 'idle' && lastSavedAt && (
                                    <>Last saved {lastSavedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="blog-action-bar-right">
                        <button type="button" className="blog-btn blog-btn-secondary" onClick={() => handleSave(false)}>
                            <Save size={14} /> Save Draft
                        </button>
                        <button type="button" className="blog-btn blog-btn-secondary" onClick={() => setShowPreviewModal(true)} style={{ display: 'none' }} id="mobile-preview-btn">
                            <Eye size={14} /> Preview
                        </button>
                        {/* Mobile preview button — visible only on small screens */}
                        <button type="button" className="blog-btn blog-btn-secondary" onClick={() => setShowPreviewModal(true)}
                            style={{ display: 'none' }}
                        >
                            <Eye size={14} /> Preview
                        </button>
                        <style>{`@media (max-width: 1024px) { #mobile-preview-btn { display: inline-flex !important; } }`}</style>
                        <button
                            type="button"
                            className="blog-btn blog-btn-success"
                            onClick={handlePublish}
                            disabled={publishing || !formData.title.trim()}
                        >
                            {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            {formData.status === 'scheduled' ? 'Schedule' : 'Publish'}
                        </button>
                    </div>
                </div>

                {/* ─── Editor Content Area ────────────────────── */}
                <div style={{ maxWidth: '100%', padding: '24px 0 60px' }}>



                    {/* ═══ Section 1: Basic Information ═══════════ */}
                    <div className="blog-section-card">
                        <div className="blog-section-title">Basic Information</div>
                        <div className="blog-section-desc">Set up the title, slug, category, and tags for your article.</div>

                        {/* Title */}
                        <div className="blog-field-group">
                            <label className="blog-field-label">Title <span className="required">*</span></label>
                            <input
                                type="text"
                                className="blog-input title-input"
                                placeholder="Enter your article title..."
                                value={formData.title}
                                onChange={(e) => updateField('title', e.target.value)}
                            />
                        </div>

                        {/* Subtitle */}
                        <div className="blog-field-group">
                            <label className="blog-field-label">Subtitle / Excerpt <span className="required">*</span></label>
                            <textarea
                                className="blog-textarea"
                                placeholder="Short summary used in blog cards and article introduction..."
                                value={formData.subtitle}
                                onChange={(e) => updateField('subtitle', e.target.value)}
                                rows={3}
                            />
                        </div>

                        {/* Slug */}
                        <div className="blog-field-group">
                            <label className="blog-field-label">
                                Slug
                                <button
                                    type="button"
                                    className="blog-btn blog-btn-ghost"
                                    style={{ padding: '2px 8px', fontSize: '10px', marginLeft: '4px' }}
                                    onClick={() => updateField('slugManual', !formData.slugManual)}
                                >
                                    {formData.slugManual ? 'Auto' : 'Edit'}
                                </button>
                            </label>
                            <input
                                type="text"
                                className="blog-input"
                                value={formData.slug}
                                onChange={(e) => updateField('slug', slugify(e.target.value))}
                                readOnly={!formData.slugManual}
                                style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '12px', opacity: formData.slugManual ? 1 : 0.7 }}
                            />
                            <div className="blog-slug-preview">
                                hire1percent.com/blog/{formData.slug || '...'}
                            </div>
                        </div>

                        {/* Category */}
                        <div className="blog-field-group">
                            <label className="blog-field-label">Category <span className="required">*</span></label>
                            <select
                                className="blog-select"
                                value={formData.category}
                                onChange={(e) => updateField('category', e.target.value)}
                            >
                                {CATEGORIES.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tags */}
                        <div className="blog-field-group">
                            <label className="blog-field-label">Tags</label>
                            <div className="blog-tags-container" onClick={() => document.getElementById('blog-tag-input')?.focus()}>
                                {formData.tags.map(tag => (
                                    <span key={tag} className="blog-tag">
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)}>×</button>
                                    </span>
                                ))}
                                <input
                                    id="blog-tag-input"
                                    type="text"
                                    className="blog-tags-input"
                                    placeholder={formData.tags.length === 0 ? "Type and press Enter to add tags..." : "Add more..."}
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                />
                            </div>
                            {formData.tags.length === 0 && (
                                <div className="blog-field-hint" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                    Suggestions:
                                    {DEFAULT_TAGS.map(t => (
                                        <button key={t} type="button" onClick={() => addTag(t)}
                                            style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
                                        >{t}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══ Section 2: Author ══════════════════════ */}
                    <div className="blog-section-card">
                        <div className="blog-section-title">Author</div>
                        <div className="blog-section-desc">All articles are published under the Hire1Percent brand.</div>

                        <div className="blog-author-display">
                            <div className="blog-author-avatar">H</div>
                            <div className="blog-author-info">
                                <h4>Hire1Percent Team</h4>
                                <p>Every published article automatically shows "By Hire1Percent Team"</p>
                            </div>
                        </div>
                    </div>

                    {/* ═══ Section 3: Cover Media ═════════════════ */}
                    <div className="blog-section-card">
                        <div className="blog-section-title">Cover Media</div>
                        <div className="blog-section-desc">Upload a hero image for your article. Supports drag & drop.</div>

                        <div className="blog-field-group">
                            <label className="blog-field-label">Hero Cover Image <span className="required">*</span></label>
                            <div
                                className={`blog-cover-upload ${formData.coverImagePreview ? 'has-image' : ''}`}
                                onClick={() => !formData.coverImagePreview && fileInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                                onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                                onDrop={(e) => { e.currentTarget.classList.remove('dragover'); handleCoverDrop(e); }}
                            >
                                {formData.coverImagePreview ? (
                                    <>
                                        <img src={formData.coverImagePreview} alt={formData.coverAltText || 'Cover'} className="blog-cover-preview" />
                                        <div className="blog-cover-actions">
                                            <button type="button" className="blog-cover-action-btn" onClick={(e) => { e.stopPropagation(); openCropModal(); }} title="Crop">
                                                <Crop size={14} />
                                            </button>
                                            <button type="button" className="blog-cover-action-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} title="Replace">
                                                <Upload size={14} />
                                            </button>
                                            <button type="button" className="blog-cover-action-btn danger" onClick={(e) => { e.stopPropagation(); updateField('coverImagePreview', ''); updateField('coverImage', null); }} title="Remove">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={28} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569', margin: '0 0 4px' }}>Click or drag image here</p>
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Recommended: 1200 × 630px, PNG or JPG</p>
                                    </>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverUpload}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>

                        <div className="blog-field-group">
                            <label className="blog-field-label">Cover Image Alt Text <span className="required">*</span></label>
                            <input
                                type="text"
                                className="blog-input"
                                placeholder="Describe the image for accessibility and SEO..."
                                value={formData.coverAltText}
                                onChange={(e) => updateField('coverAltText', e.target.value)}
                            />
                        </div>

                        <div className="blog-field-group">
                            <label className="blog-field-label">Cover Caption <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                            <input
                                type="text"
                                className="blog-input"
                                placeholder="e.g., Hire1Percent AI Interview Dashboard"
                                value={formData.coverCaption}
                                onChange={(e) => updateField('coverCaption', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* ═══ Section 4: Article Content ═════════════ */}
                    <div className="blog-section-card" style={{ padding: '28px 0 0' }}>
                        <div style={{ padding: '0 28px' }}>
                            <div className="blog-section-title">Article Content</div>
                            <div className="blog-section-desc">Write your article using the rich text editor. Supports markdown shortcuts.</div>
                        </div>

                        <div className="blog-tiptap-editor-area" style={{ borderRadius: '0 0 20px 20px', border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                            <EditorToolbar editor={editor} />
                            <EditorContent editor={editor} />
                            <div className="blog-editor-meta-bar">
                                <div className="blog-editor-meta-item">
                                    <Type size={11} /> {countWords(editorHTML)} words
                                </div>
                                <div className="blog-editor-meta-item">
                                    <Clock size={11} /> {calculateReadingTime(editorHTML)}
                                </div>
                                <div className="blog-editor-meta-item">
                                    <Hash size={11} /> {extractTOCFromHTML(editorHTML).length} headings
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══ Section 5: Publishing ══════════════════ */}
                    <div className="blog-section-card">
                        <div className="blog-section-title">Publishing</div>
                        <div className="blog-section-desc">Choose when and how to publish your article.</div>

                        <div className="blog-field-group">
                            <label className="blog-field-label">Status</label>
                            <div className="blog-radio-group">
                                {[
                                    { value: 'draft', label: 'Draft' },
                                    { value: 'published', label: 'Publish Immediately' },
                                    { value: 'scheduled', label: 'Schedule' },
                                ].map(opt => (
                                    <div key={opt.value} className={`blog-radio-option ${formData.status === opt.value ? 'active' : ''}`} onClick={() => updateField('status', opt.value)}>
                                        <input type="radio" name="status" value={opt.value} checked={formData.status === opt.value} onChange={() => updateField('status', opt.value)} />
                                        <label>{opt.label}</label>
                                    </div>
                                ))}
                            </div>

                            {formData.status === 'scheduled' && (
                                <div className="blog-schedule-row">
                                    <input
                                        type="date"
                                        value={formData.scheduledDate}
                                        onChange={(e) => updateField('scheduledDate', e.target.value)}
                                    />
                                    <input
                                        type="time"
                                        value={formData.scheduledTime}
                                        onChange={(e) => updateField('scheduledTime', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="blog-field-group" style={{ marginTop: '16px' }}>
                            <div className="blog-checkbox-row" onClick={() => updateField('isFeatured', !formData.isFeatured)}>
                                <input type="checkbox" checked={formData.isFeatured} onChange={(e) => updateField('isFeatured', e.target.checked)} />
                                <label>Featured Article</label>
                            </div>
                            {formData.isFeatured && existingFeatured && existingFeatured._id !== postId && (
                                <div className="blog-field-warning" style={{ marginTop: '8px' }}>
                                    <AlertTriangle size={12} />
                                    <span>"{existingFeatured.title}" is currently featured. It will be replaced.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══ Section 6: SEO ═════════════════════════ */}
                    <div className="blog-section-card">
                        <div className="blog-section-title">SEO</div>
                        <div className="blog-section-desc">Optimize your article for search engines and social sharing.</div>

                        <div className="blog-field-group">
                            <label className="blog-field-label">Meta Title</label>
                            <input
                                type="text"
                                className="blog-input"
                                placeholder="e.g., AI Resume Screening Guide (2026) | Hire1Percent"
                                value={formData.seoTitle}
                                onChange={(e) => updateField('seoTitle', e.target.value)}
                            />
                            <div className="blog-seo-meter">
                                <div className="blog-seo-meter-bar">
                                    <div className={`blog-seo-meter-fill ${seoMeterClass(seoTitlePercent)}`} style={{ width: `${Math.min(100, seoTitlePercent)}%` }} />
                                </div>
                                <span className={`blog-seo-meter-text ${seoMeterClass(seoTitlePercent)}`} style={{ color: seoTitlePercent > 100 ? '#ef4444' : seoTitlePercent > 85 ? '#f59e0b' : '#94a3b8' }}>
                                    {formData.seoTitle.length}/{META_TITLE_MAX}
                                </span>
                            </div>
                        </div>

                        <div className="blog-field-group">
                            <label className="blog-field-label">Meta Description</label>
                            <textarea
                                className="blog-textarea"
                                placeholder="e.g., Learn how AI-powered technical assessments help companies hire better engineers..."
                                value={formData.seoDescription}
                                onChange={(e) => updateField('seoDescription', e.target.value)}
                                rows={3}
                            />
                            <div className="blog-seo-meter">
                                <div className="blog-seo-meter-bar">
                                    <div className={`blog-seo-meter-fill ${seoMeterClass(seoDescPercent)}`} style={{ width: `${Math.min(100, seoDescPercent)}%` }} />
                                </div>
                                <span className={`blog-seo-meter-text ${seoMeterClass(seoDescPercent)}`} style={{ color: seoDescPercent > 100 ? '#ef4444' : seoDescPercent > 85 ? '#f59e0b' : '#94a3b8' }}>
                                    {formData.seoDescription.length}/{META_DESC_MAX}
                                </span>
                            </div>
                        </div>

                        <div className="blog-field-group">
                            <label className="blog-field-label">SEO Keywords</label>
                            <input
                                type="text"
                                className="blog-input"
                                placeholder="AI Hiring, ATS, Resume Screening, Technical Hiring"
                                value={formData.seoKeywords}
                                onChange={(e) => updateField('seoKeywords', e.target.value)}
                            />
                            <div className="blog-field-hint">Comma separated keywords</div>
                        </div>

                        <div className="blog-field-group">
                            <label className="blog-field-label">Open Graph Image <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400 }}>(optional — defaults to cover)</span></label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {formData.ogImagePreview && (
                                    <img src={formData.ogImagePreview} alt="OG" style={{ width: '80px', height: '42px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)' }} />
                                )}
                                <button type="button" className="blog-btn blog-btn-secondary" onClick={() => ogFileInputRef.current?.click()}>
                                    <Upload size={12} /> {formData.ogImagePreview ? 'Replace' : 'Upload'}
                                </button>
                                {formData.ogImagePreview && (
                                    <button type="button" className="blog-btn blog-btn-ghost" onClick={() => { updateField('ogImagePreview', ''); updateField('ogImage', null); }}>
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <input ref={ogFileInputRef} type="file" accept="image/*" onChange={handleOGImageUpload} style={{ display: 'none' }} />
                        </div>


                    </div>



                </div>
            </div>

            {/* ═══ Right Panel: Live Preview ═══════════════════ */}
            <div className="blog-editor-preview-panel">
                <LivePreview
                    formData={formData}
                    editorHTML={editorHTML}
                    previewMode={previewMode}
                    setPreviewMode={setPreviewMode}
                />
            </div>

            {/* ═══ Mobile Preview Modal ═══════════════════════ */}
            {showPreviewModal && (
                <div className="blog-mobile-preview-overlay" onClick={() => setShowPreviewModal(false)}>
                    <div className="blog-mobile-preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="blog-mobile-preview-header">
                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Article Preview</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="blog-preview-modes">
                                    {[
                                        { key: 'desktop', icon: <Monitor size={12} /> },
                                        { key: 'tablet', icon: <Tablet size={12} /> },
                                        { key: 'mobile', icon: <Smartphone size={12} /> },
                                    ].map(m => (
                                        <button
                                            key={m.key}
                                            type="button"
                                            className={`blog-preview-mode-btn ${previewMode === m.key ? 'active' : ''}`}
                                            onClick={() => setPreviewMode(m.key)}
                                        >
                                            {m.icon}
                                        </button>
                                    ))}
                                </div>
                                <button type="button" className="blog-btn blog-btn-ghost" onClick={() => setShowPreviewModal(false)}>
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <LivePreview
                            formData={formData}
                            editorHTML={editorHTML}
                            previewMode={previewMode}
                            setPreviewMode={setPreviewMode}
                            isMobileModal={true}
                        />
                    </div>
                </div>
            )}

            {/* ═══ Crop Modal ═════════════════════════════════ */}
            {showCropModal && (
                <div className="blog-crop-modal-overlay" onClick={() => setShowCropModal(false)}>
                    <div className="blog-crop-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="blog-crop-modal-header">
                            <h3>Crop Cover Image</h3>
                            <button type="button" className="blog-btn blog-btn-ghost" onClick={() => setShowCropModal(false)}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="blog-crop-container">
                            <Cropper
                                image={cropImage}
                                crop={crop}
                                zoom={zoom}
                                aspect={1200 / 630}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={handleCropComplete}
                            />
                        </div>
                        <div className="blog-crop-modal-footer">
                            <button type="button" className="blog-btn blog-btn-secondary" onClick={() => setShowCropModal(false)}>
                                Cancel
                            </button>
                            <button type="button" className="blog-btn blog-btn-primary" onClick={applyCrop}>
                                Apply Crop
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
    Clock, ArrowLeft, Calendar, Share2, Linkedin, Twitter, 
    Copy, User, BookOpen, ChevronRight, Loader2, ArrowRight, Sparkles
} from 'lucide-react';
import { getBlogPostBySlug, getRelatedPosts } from '../../services/blogService';

export default function BlogPostDetailsPage() {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [related, setRelated] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toc, setToc] = useState([]);
    const [activeTocId, setActiveTocId] = useState('');
    const [scrollProgress, setScrollProgress] = useState(0);
    const [copied, setCopied] = useState(false);

    const articleRef = useRef(null);

    // Fetch article details & related posts
    useEffect(() => {
        const fetchArticleData = async () => {
            setLoading(true);
            try {
                const res = await getBlogPostBySlug(slug);
                if (res?.success && res.post) {
                    setPost(res.post);
                    
                    // Parse headings for Table of Contents
                    parseHeadingsForTOC(res.post.content);

                    // Fetch related posts
                    const relRes = await getRelatedPosts(res.post._id);
                    setRelated(relRes.posts || []);
                } else {
                    setPost(null);
                }
            } catch (err) {
                console.error("Failed to load article:", err);
                setPost(null);
            } finally {
                setLoading(false);
            }
        };
        fetchArticleData();
    }, [slug]);

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
            const headings = articleRef.current?.querySelectorAll('h2, h3') || [];
            let currentActiveId = '';
            
            for (let i = 0; i < headings.length; i++) {
                const rect = headings[i].getBoundingClientRect();
                // If heading is near the top of the viewport
                if (rect.top <= 140) {
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
        return () => window.removeEventListener('scroll', handleScroll);
    }, [toc]);

    // Parse Markdown headings for the dynamic Table of Contents
    const parseHeadingsForTOC = (markdown) => {
        if (!markdown) return;
        const lines = markdown.split('\n');
        const headingItems = [];
        
        lines.forEach(line => {
            const h2Match = line.match(/^## (.*$)/);
            if (h2Match) {
                const text = h2Match[1].trim();
                const id = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
                headingItems.push({ id, text, level: 2 });
            }
        });
        setToc(headingItems);
    };

    // Calculate reading time
    const calculateReadTime = (text) => {
        if (!text) return '3 min read';
        const words = text.trim().split(/\s+/).length;
        const time = Math.ceil(words / 225);
        return `${time} min read`;
    };

    // Markdown-to-HTML formatter with custom anchor IDs for TOC
    const formatMarkdownToHTML = (md) => {
        if (!md) return '';
        let html = md
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Dynamic Headings with Anchor IDs matching TOC
        html = html.replace(/^### (.*$)/gim, (match, title) => {
            const cleanTitle = title.trim();
            const id = cleanTitle.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
            return `<h3 id="${id}" class="text-xl font-black text-white mt-8 mb-3 scroll-mt-28 flex items-center group">${cleanTitle}</h3>`;
        });

        html = html.replace(/^## (.*$)/gim, (match, title) => {
            const cleanTitle = title.trim();
            const id = cleanTitle.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
            return `<h2 id="${id}" class="text-2xl md:text-3xl font-black text-white mt-10 mb-4 scroll-mt-28 flex items-center group border-b border-white/5 pb-2">${cleanTitle}</h2>`;
        });

        html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl md:text-4xl font-black text-white mt-12 mb-6 leading-tight">$1</h1>');

        // Bold & Italic
        html = html.replace(/\*\*(.*)\*\*/gim, '<strong class="font-extrabold text-white">$1</strong>');
        html = html.replace(/\*(.*)\*/gim, '<em class="italic text-gray-300">$1</em>');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-400 hover:text-blue-300 underline font-semibold transition-colors">$1</a>');

        // Images
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<span class="block my-6"><img src="$2" alt="$1" class="rounded-[2rem] border border-white/10 w-full max-h-96 object-cover" /><span class="block text-center text-[10px] text-gray-500 font-medium mt-2">$1</span></span>');

        // Code blocks
        html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-black/40 border border-white/10 text-teal-400 font-mono text-xs md:text-sm p-5 rounded-2xl my-6 overflow-x-auto select-text leading-relaxed">$1</pre>');
        html = html.replace(/`([^`]+)`/g, '<code class="bg-white/5 font-mono text-xs px-2 py-0.5 rounded-lg text-rose-400 border border-white/5">$1</code>');

        // Blockquotes
        html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500 pl-5 py-2 my-6 italic text-gray-300 bg-white/[0.02] rounded-r-2xl">$1</blockquote>');

        // Lists
        html = html.replace(/^\- (.*$)/gim, '<li class="flex items-start gap-2.5 my-1.5 text-gray-300 text-sm leading-relaxed"><span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2"></span><span>$1</span></li>');
        html = html.replace(/<\/li>\n<li/g, '</li><li'); // join contiguous list tags

        // Paragraphs & layout spacing
        html = html.replace(/\n\s*\n/g, '</p><p class="text-gray-300 text-sm md:text-base leading-relaxed mb-6 font-normal">');

        return `<p class="text-gray-300 text-sm md:text-base leading-relaxed mb-6 font-normal">${html}</p>`;
    };

    // Social Sharing
    const shareOnLinkedIn = () => {
        const shareUrl = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(post?.title || "");
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
        setTimeout(() => setCopied(false), 3000);
    };

    // Load state
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0c0f16] flex items-center justify-center text-gray-500">
                <Loader2 className="animate-spin mr-3 text-white" size={24} />
                <span className="font-bold uppercase tracking-wider text-xs">Loading article details...</span>
            </div>
        );
    }

    // Article not found
    if (!post) {
        return (
            <div className="min-h-screen bg-[#0c0f16] text-white flex flex-col items-center justify-center p-6 text-center">
                <BookOpen className="opacity-20 mb-4" size={64} />
                <h2 className="text-2xl font-black mb-2">Article Not Found</h2>
                <p className="text-gray-400 text-sm max-w-sm mb-6">The article you are looking for may have been archived, deleted, or the URL slug is misspelled.</p>
                <Link to="/blog" className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all">
                    Back to Blog Landing
                </Link>
            </div>
        );
    }

    // Dynamic SEO values
    const seoTitle = post.seo?.metaTitle || `${post.title} | Hire1Percent Blog`;
    const seoDesc = post.seo?.metaDescription || post.subtitle || post.content.substring(0, 155).replace(/[#*`_]/g, '');
    const canonicalUrl = `${window.location.origin}/blog/${post.slug}`;
    const coverUrl = post.coverImage || `${window.location.origin}/og-image.png`;

    // JSON-LD Structured Data
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.subtitle || seoDesc,
        "image": coverUrl,
        "author": {
            "@type": "Person",
            "name": post.authorId?.name || "Hire1Percent Editor",
            "jobTitle": post.authorId?.designation || "Editorial Team"
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

    return (
        <div className="min-h-screen text-white font-sans bg-[#0c0f16] selection:bg-blue-500/30 pb-28 pt-24 relative">
            
            {/* SEO Helmet metadata */}
            <Helmet>
                <title>{seoTitle}</title>
                <meta name="description" content={seoDesc} />
                {post.seo?.keywords && post.seo.keywords.length > 0 && (
                    <meta name="keywords" content={post.seo.keywords.join(', ')} />
                )}
                <link rel="canonical" href={canonicalUrl} />
                
                {/* OpenGraph Tags */}
                <meta property="og:title" content={seoTitle} />
                <meta property="og:description" content={seoDesc} />
                <meta property="og:image" content={coverUrl} />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:type" content="article" />

                {/* Twitter Cards */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={seoTitle} />
                <meta name="twitter:description" content={seoDesc} />
                <meta name="twitter:image" content={coverUrl} />

                {/* JSON-LD Structured Data */}
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>

            {/* Locked Top Reading Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-[3px] bg-white/5 z-50">
                <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-teal-400 transition-all duration-75"
                    style={{ width: `${scrollProgress}%` }}
                />
            </div>

            {/* Back Arrow link */}
            <div className="container mx-auto px-6 max-w-7xl pt-4 mb-8">
                <Link 
                    to="/blog" 
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={12} /> Back to Articles
                </Link>
            </div>

            {/* Main Layout Container */}
            <div className="container mx-auto px-6 max-w-7xl">
                
                {/* Article Header */}
                <header className="max-w-4xl mb-10 space-y-4">
                    <span className="px-3.5 py-1.5 rounded-xl bg-blue-600/10 border border-blue-500/25 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                        {post.category?.name || "Insights"}
                    </span>
                    
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-white">
                        {post.title}
                    </h1>

                    {post.subtitle && (
                        <p className="text-gray-400 text-lg md:text-xl font-light leading-relaxed">
                            {post.subtitle}
                        </p>
                    )}

                    {/* Metadata: Date, Read time, Author */}
                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2.5">
                            {post.authorId?.profilePic ? (
                                <img src={post.authorId.profilePic} alt="" className="w-9 h-9 rounded-full object-cover border border-white/10" />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-blue-600/10 border border-white/10 flex items-center justify-center text-blue-400">
                                    <User size={14} />
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-extrabold text-white">{post.authorId?.name || "Hire1Percent Editor"}</p>
                                <p className="text-[9px] text-gray-500 font-medium">{post.authorId?.designation || "Editorial Team"}</p>
                            </div>
                        </div>

                        <span className="text-white/20">|</span>

                        <div className="flex items-center gap-4 text-xs text-gray-500 font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(post.publishedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                            <span className="flex items-center gap-1.5"><Clock size={12} /> {calculateReadTime(post.content)}</span>
                        </div>
                    </div>
                </header>

                {/* HD Cover Image Banner */}
                <div className="rounded-[2.5rem] overflow-hidden border border-white/10 w-full h-[250px] md:h-[500px] mb-12 shadow-2xl">
                    {post.coverImage ? (
                        <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-950/20 via-transparent to-teal-950/20 flex items-center justify-center text-white/5">
                            <BookOpen size={96} />
                        </div>
                    )}
                </div>

                {/* Split Screen Layout (Desktop: Article vs Sidebar) */}
                <div className="flex flex-col lg:flex-row gap-12 items-start">
                    
                    {/* Left Column - Main Body content */}
                    <article 
                        ref={articleRef}
                        className="w-full lg:w-2/3 select-text prose prose-invert max-w-none text-gray-300"
                        dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(post.content) }}
                    />

                    {/* Right Column - Sticky Sidebar */}
                    <aside className="w-full lg:w-1/3 lg:sticky lg:top-28 space-y-6">
                        
                        {/* Table of Contents */}
                        {toc.length > 0 && (
                            <div className="p-6 rounded-[2rem] border border-white/10 bg-white/[0.01] backdrop-blur-md space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-white/5 pb-2">Table of Contents</h4>
                                <ul className="space-y-3">
                                    {toc.map((item, idx) => (
                                        <li key={idx} style={{ paddingLeft: `${(item.level - 2) * 12}px` }}>
                                            <a 
                                                href={`#${item.id}`}
                                                className={`text-xs font-bold leading-normal transition-colors flex items-center gap-1.5 group cursor-pointer ${activeTocId === item.id 
                                                    ? 'text-blue-400 font-extrabold' 
                                                    : 'text-gray-500 hover:text-white'}`}
                                            >
                                                <ChevronRight size={10} className={`shrink-0 transition-transform ${activeTocId === item.id ? 'translate-x-0.5 text-blue-400' : 'opacity-0 group-hover:opacity-100 text-white'}`} />
                                                <span>{item.text}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Social Share triggers */}
                        <div className="p-6 rounded-[2rem] border border-white/10 bg-white/[0.01] backdrop-blur-md space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-white/5 pb-2">Share Article</h4>
                            <div className="flex gap-2">
                                <button
                                    onClick={shareOnLinkedIn}
                                    className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer"
                                >
                                    <Linkedin size={14} /> LinkedIn
                                </button>
                                <button
                                    onClick={shareOnTwitter}
                                    className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer"
                                >
                                    <Twitter size={14} /> Twitter
                                </button>
                                <button
                                    onClick={copyLinkToClipboard}
                                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer relative"
                                    title="Copy Link"
                                >
                                    <Copy size={14} />
                                    {copied && (
                                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded font-black whitespace-nowrap">Copied!</span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Platform CTA prompt */}
                        <div className="p-7 rounded-[2rem] border border-blue-500/20 bg-gradient-to-br from-blue-600/[0.08] to-teal-500/[0.02] backdrop-blur-md space-y-4 text-center shadow-xl">
                            <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mx-auto">
                                <Sparkles size={20} />
                            </div>
                            <h4 className="text-base font-black text-white">Ace Your Tech Interviews</h4>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Experience realistic, technical coding and system design mock interviews with our advanced AI Agents. Get detailed feedback logs instantly.
                            </p>
                            <Link 
                                to="/login"
                                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10"
                            >
                                Practice Mock Interview <ArrowRight size={12} />
                            </Link>
                        </div>

                    </aside>
                </div>

                {/* Bottom Section - Author Profile Card */}
                <div className="max-w-4xl border-t border-white/5 pt-12 mt-16">
                    <div className="p-6 md:p-8 rounded-[2rem] border border-white/10 bg-white/[0.01] flex flex-col md:flex-row items-center md:items-start gap-6">
                        {post.authorId?.profilePic ? (
                            <img src={post.authorId.profilePic} alt="" className="w-16 h-16 rounded-full object-cover border border-white/10 shrink-0" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-blue-600/10 border border-white/10 flex items-center justify-center text-blue-400 shrink-0">
                                <User size={24} />
                            </div>
                        )}
                        <div className="text-center md:text-left space-y-2">
                            <h4 className="text-base font-extrabold text-white">{post.authorId?.name || "Hire1Percent Editor"}</h4>
                            <p className="text-xs text-blue-400 font-extrabold uppercase tracking-wider">{post.authorId?.designation || "Editorial Contributor"}</p>
                            <p className="text-gray-400 text-sm leading-relaxed font-normal">
                                {post.authorId?.bio || "Shaping the future of developer acquisition, skills ranking, and automated AI vetting solutions at Hire1Percent."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Section - Related Articles grid */}
                {related.length > 0 && (
                    <div className="border-t border-white/5 pt-16 mt-16 space-y-8">
                        <div className="flex items-center gap-2">
                            <BookOpen size={18} className="text-blue-400" />
                            <h3 className="text-xl md:text-2xl font-black text-white">Related Articles</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {related.map(relPost => (
                                <Link to={`/blog/${relPost.slug}`} key={relPost._id} className="group flex flex-col justify-between h-[360px] rounded-[2rem] border border-white/10 bg-white/[0.01] hover:bg-white/[0.02] p-5 hover:border-blue-500/25 transition-all duration-300">
                                    <div>
                                        <div className="h-40 rounded-2xl overflow-hidden border border-white/5">
                                            {relPost.coverImage ? (
                                                <img src={relPost.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300" />
                                            ) : (
                                                <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/10">
                                                    <BookOpen size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-4 space-y-1.5">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{new Date(relPost.publishedAt).toLocaleDateString()}</p>
                                            <h4 className="text-base font-black text-white group-hover:text-blue-400 line-clamp-2 transition-colors">
                                                {relPost.title}
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-3">
                                        <div className="flex items-center gap-2">
                                            {relPost.authorId?.profilePic ? (
                                                <img src={relPost.authorId.profilePic} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10" />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-blue-600/10 border border-white/10 flex items-center justify-center text-blue-400">
                                                    <User size={10} />
                                                </div>
                                            )}
                                            <span className="text-xs font-black text-white/80 truncate max-w-[120px]">{relPost.authorId?.name}</span>
                                        </div>
                                        <ArrowRight size={14} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

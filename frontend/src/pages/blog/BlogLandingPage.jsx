import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, Mail, User, BookOpen, AlertCircle, Calendar, Sun, Moon } from 'lucide-react';
import { getBlogPosts, getFeaturedPost, getBlogCategories, subscribeNewsletter } from '../../services/blogService';
import { useBlogTheme } from './BlogThemeContext';

/* ─── Category Tabs (exact order per CodeSignal specification) ─── */
const navItems = [
    { name: 'The Latest', slug: '' },
    { name: 'Interview Prep', slug: 'technical-assessments' },
    { name: 'Tech Recruiting', slug: 'ai-hiring' },
    { name: 'Engineering', slug: 'engineering-hiring' },
    { name: 'Product Updates', slug: 'product-updates' },
    { name: 'All Posts', slug: 'all' }
];

export default function BlogLandingPage() {
    const { isDark, toggleTheme } = useBlogTheme();
    const [posts, setPosts] = useState([]);
    const [featured, setFeatured] = useState(null);
    const [categories, setCategories] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const activeCategory = searchParams.get('category') || '';
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Category posts states for Home/Latest view
    const [technicalAssessmentsPosts, setTechnicalAssessmentsPosts] = useState([]);
    const [aiHiringPosts, setAiHiringPosts] = useState([]);
    const [engineeringHiringPosts, setEngineeringHiringPosts] = useState([]);
    const [productUpdatesPosts, setProductUpdatesPosts] = useState([]);

    // Newsletter states
    const [email, setEmail] = useState('');
    const [submittingEmail, setSubmittingEmail] = useState(false);
    const [newsMsg, setNewsMsg] = useState({ text: '', type: '' });
    const [allPostsCache, setAllPostsCache] = useState([]);

    // ─── Theme-aware color tokens ───
    const t = isDark ? {
        pageBg: '#0c0f16',
        pageText: '#e2e8f0',
        cardBg: '#151922',
        cardBorder: '#1e2535',
        cardHoverShadow: 'rgba(59,130,246,0.12)',
        navBg: '#151922',
        navBorder: '#1e2535',
        tabText: '#94a3b8',
        tabActiveText: '#60a5fa',
        tabHoverText: '#60a5fa',
        headingText: '#f1f5f9',
        subText: '#94a3b8',
        mutedText: '#64748b',
        accentText: '#60a5fa',
        accentHover: '#3b82f6',
        borderColor: '#1e2535',
        sectionBorder: '#1e2535',
        skeletonBg: '#1e2535',
        skeletonShimmer: 'linear-gradient(90deg, #1e2535 0%, #2a3348 50%, #1e2535 100%)',
        emptyBg: '#151922',
        emptyBorder: '#1e2535',
        paginationBorder: '#1e2535',
        paginationBg: '#151922',
        paginationText: '#94a3b8',
        paginationHoverBorder: '#3b82f6',
        paginationHoverText: '#60a5fa',
        authorBg: '#1e2535',
        authorBorder: '#2a3348',
        authorText: '#e2e8f0',
        footerBorder: '#1e2535',
        readMoreText: '#60a5fa',
        descText: '#94a3b8',
        metaText: '#64748b',
        metaDot: '#334155',
        placeholderGradient: 'linear-gradient(135deg, #1e3a5f, #1e1b4b)',
    } : {
        pageBg: '#ffffff',
        pageText: '#1a1a2e',
        cardBg: '#ffffff',
        cardBorder: '#eef0f4',
        cardHoverShadow: 'rgba(0,0,0,0.08)',
        navBg: '#e8edf6',
        navBorder: 'transparent',
        tabText: '#475569',
        tabActiveText: '#2563eb',
        tabHoverText: '#2563eb',
        headingText: '#0f172a',
        subText: '#64748b',
        mutedText: '#94a3b8',
        accentText: '#2563eb',
        accentHover: '#1d4ed8',
        borderColor: '#eef0f4',
        sectionBorder: '#e5e7eb',
        skeletonBg: '#f1f5f9',
        skeletonShimmer: 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
        emptyBg: '#ffffff',
        emptyBorder: '#eef0f4',
        paginationBorder: '#e2e5ea',
        paginationBg: '#ffffff',
        paginationText: '#4a5568',
        paginationHoverBorder: '#2563eb',
        paginationHoverText: '#2563eb',
        authorBg: '#eff6ff',
        authorBorder: '#dbeafe',
        authorText: '#334155',
        footerBorder: '#f1f5f9',
        readMoreText: '#2563eb',
        descText: '#64748b',
        metaText: '#94a3b8',
        metaDot: '#d1d5db',
        placeholderGradient: 'linear-gradient(135deg, #dbeafe, #e0e7ff)',
    };

    // Fetch categories on mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await getBlogCategories();
                setCategories(res.categories || []);
            } catch (err) {
                console.error("Failed to load categories:", err);
            }
        };
        fetchCategories();
    }, []);

    // Fetch posts when filters change
    const fetchPosts = async (isNewCategory = false) => {
        setLoading(true);
        const currentPage = isNewCategory ? 1 : page;
        if (isNewCategory) setPage(1);

        const apiCategory = (activeCategory && activeCategory !== 'all') ? activeCategory : undefined;
        const isDefaultView = activeCategory === '';

        try {
            if (isDefaultView && currentPage === 1) {
                // Fetch featured, latest, and category posts in parallel
                const [featRes, latestRes, techRes, aiRes, engRes, prodRes] = await Promise.all([
                    getFeaturedPost().catch(() => null),
                    getBlogPosts({ page: 1, limit: 5 }),
                    getBlogPosts({ category: 'technical-assessments', limit: 3 }).catch(() => ({ posts: [] })),
                    getBlogPosts({ category: 'ai-hiring', limit: 3 }).catch(() => ({ posts: [] })),
                    getBlogPosts({ category: 'engineering-hiring', limit: 3 }).catch(() => ({ posts: [] })),
                    getBlogPosts({ category: 'product-updates', limit: 3 }).catch(() => ({ posts: [] })),
                ]);

                const featPost = featRes?.post || null;
                setFeatured(featPost);

                let latestList = latestRes?.posts || [];
                if (featPost) {
                    latestList = latestList.filter(p => p._id !== featPost._id);
                }
                setPosts(latestList);

                setTechnicalAssessmentsPosts(techRes?.posts || []);
                setAiHiringPosts(aiRes?.posts || []);
                setEngineeringHiringPosts(engRes?.posts || []);
                setProductUpdatesPosts(prodRes?.posts || []);
                setTotalPages(1);
            } else {
                setFeatured(null);
                const res = await getBlogPosts({
                    page: currentPage,
                    limit: 9,
                    category: apiCategory,
                });
                const fetchedList = res.posts || [];
                setPosts(fetchedList);
                setTotalPages(res.pages || 1);
                
                if (activeCategory === 'all' && currentPage === 1) {
                    setAllPostsCache(fetchedList);
                }
            }
        } catch (err) {
            console.error("Failed to load posts:", err);
        } finally {
            setLoading(false);
        }
    };

    const lastCategoryRef = useRef(activeCategory);

    useEffect(() => {
        if (lastCategoryRef.current !== activeCategory) {
            lastCategoryRef.current = activeCategory;
            if (page !== 1) {
                setPage(1);
                return;
            }
            // Instantly load cached/pre-fetched posts to prevent lag
            if (activeCategory === 'technical-assessments') {
                setPosts(technicalAssessmentsPosts);
            } else if (activeCategory === 'ai-hiring') {
                setPosts(aiHiringPosts);
            } else if (activeCategory === 'engineering-hiring') {
                setPosts(engineeringHiringPosts);
            } else if (activeCategory === 'product-updates') {
                setPosts(productUpdatesPosts);
            } else if (activeCategory === 'all') {
                setPosts(allPostsCache);
            } else {
                setPosts([]);
            }
        }
        fetchPosts();
    }, [page, activeCategory]);

    const handleCategoryClick = (categorySlug) => {
        if (categorySlug) {
            setSearchParams({ category: categorySlug });
        } else {
            setSearchParams({});
        }
    };

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setSubmittingEmail(true);
        setNewsMsg({ text: '', type: '' });
        try {
            await subscribeNewsletter(email);
            setNewsMsg({ text: '🎉 Subscription successful!', type: 'success' });
            setEmail('');
        } catch (err) {
            setNewsMsg({ text: err.message || 'Subscription failed.', type: 'error' });
        } finally {
            setSubmittingEmail(false);
        }
    };

    const calculateReadTime = (text) => {
        if (!text) return '3 min read';
        const words = text.trim().split(/\s+/).length;
        return `${Math.ceil(words / 225)} min read`;
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const hasCachedData = () => {
        if (activeCategory === '') return technicalAssessmentsPosts.length > 0;
        if (activeCategory === 'technical-assessments') return technicalAssessmentsPosts.length > 0;
        if (activeCategory === 'ai-hiring') return aiHiringPosts.length > 0;
        if (activeCategory === 'engineering-hiring') return engineeringHiringPosts.length > 0;
        if (activeCategory === 'product-updates') return productUpdatesPosts.length > 0;
        if (activeCategory === 'all') return allPostsCache.length > 0;
        return false;
    };

    const isTabActive = (slug) => {
        if (slug === '' && (!activeCategory || activeCategory === '')) return true;
        if (slug === 'all' && activeCategory === 'all') return true;
        if (slug !== '' && slug !== 'all' && activeCategory === slug) return true;
        return false;
    };

    const activeCategoryLabel = () => {
        if (!activeCategory || activeCategory === '' || activeCategory === 'all') return 'Latest posts';
        const found = navItems.find(n => n.slug === activeCategory);
        return found ? found.name : 'Posts';
    };

    const getCategoryDisplayLabel = (categoryObj) => {
        const slug = typeof categoryObj === 'object' ? categoryObj?.slug : categoryObj;
        const found = navItems.find(n => n.slug === slug);
        return found ? found.name : (typeof categoryObj === 'object' ? categoryObj?.name : categoryObj || 'Article');
    };

    const renderGridCard = (post) => {
        const categoryLabel = getCategoryDisplayLabel(post.category);
        return (
            <Link key={post._id} to={`/blog/${post.slug}`} state={{ post }} className="group flex flex-col no-underline" style={{ color: t.pageText }}>
                <div style={{ borderRadius: '1.5rem', overflow: 'hidden', border: `1px solid ${t.cardBorder}`, background: isDark ? t.cardBg : '#f8fafc', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 0.3s ease' }}>
                    {post.coverImage ? (
                        <img src={post.coverImage} alt="" className="w-full h-auto block group-hover:scale-[1.03] transition-transform duration-500" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: t.placeholderGradient, color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.05)' }}>
                            <BookOpen size={48} />
                        </div>
                    )}
                </div>
                <div className="mt-3.5 space-y-1.5">
                    <span style={{ fontSize: '10px', fontWeight: 700, color: t.accentText, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>
                        {categoryLabel}
                    </span>
                    <h3 className="group-hover:!text-blue-500 leading-snug transition-colors duration-200 line-clamp-2" style={{ fontSize: '1rem', fontWeight: 800, color: t.headingText }}>
                        {post.title}
                    </h3>
                </div>
            </Link>
        );
    };

    const renderLatestTab = () => {
        const mainPost = featured || posts[0];
        const sidePosts = featured ? posts.slice(0, 2) : posts.slice(1, 3);

        return (
            <div className="space-y-20 mt-8">
                {/* ─── LATEST POSTS SECTION ─── */}
                <div className="space-y-6">
                    <div className="flex justify-between items-end pb-3" style={{ borderBottom: `1px solid ${t.sectionBorder}` }}>
                        <h2 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.02em', color: t.headingText }}>Latest posts</h2>
                        <button 
                            onClick={() => handleCategoryClick('all')} 
                            className="font-semibold text-sm flex items-center gap-1 bg-transparent border-none cursor-pointer"
                            style={{ color: t.accentText }}
                        >
                            View all posts <ArrowRight size={14} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-8">
                        {/* Main Post (Left side, big) */}
                        {mainPost && (
                            <Link to={`/blog/${mainPost.slug}`} state={{ post: mainPost }} className="group flex flex-col no-underline">
                                <div style={{ borderRadius: '1rem', overflow: 'hidden', border: `1px solid ${t.cardBorder}`, aspectRatio: '1200/630', background: isDark ? t.cardBg : '#f8fafc', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    {mainPost.coverImage ? (
                                        <img src={mainPost.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center" style={{ background: t.placeholderGradient, color: 'rgba(255,255,255,0.05)' }}>
                                            <BookOpen size={64} />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 space-y-2">
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: t.accentText, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>
                                        {getCategoryDisplayLabel(mainPost.category)}
                                    </span>
                                    <h3 className="group-hover:!text-blue-500 leading-tight tracking-tight transition-colors duration-200" style={{ fontSize: 'clamp(1.5rem, 3vw, 1.75rem)', fontWeight: 900, color: t.headingText }}>
                                        {mainPost.title}
                                    </h3>
                                    <p style={{ color: t.subText, fontSize: '0.9rem', lineHeight: 1.65 }} className="line-clamp-3">
                                        {mainPost.subtitle || (mainPost.content ? mainPost.content.substring(0, 160).replace(/[#*`_]/g, '') + '...' : '')}
                                    </p>
                                </div>
                            </Link>
                        )}

                        {/* Stacked Side Posts (Right side, smaller) */}
                        <div className="flex flex-col gap-6 justify-start">
                            {sidePosts.map((post) => (
                                <Link key={post._id} to={`/blog/${post.slug}`} state={{ post }} className="group flex flex-col no-underline">
                                    <div style={{ borderRadius: '0.75rem', overflow: 'hidden', border: `1px solid ${t.cardBorder}`, aspectRatio: '1200/630', background: isDark ? t.cardBg : '#f8fafc', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                        {post.coverImage ? (
                                            <img src={post.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center" style={{ background: t.placeholderGradient, color: 'rgba(255,255,255,0.05)' }}>
                                                <BookOpen size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3.5 space-y-1.5">
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: t.accentText, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>
                                            {getCategoryDisplayLabel(post.category)}
                                        </span>
                                        <h4 className="group-hover:!text-blue-500 leading-snug transition-colors duration-200 line-clamp-2" style={{ fontSize: '1rem', fontWeight: 800, color: t.headingText }}>
                                            {post.title}
                                        </h4>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ─── INTERVIEW PREP SECTION ─── */}
                {technicalAssessmentsPosts.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end pb-3" style={{ borderBottom: `1px solid ${t.sectionBorder}` }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: t.headingText }}>Interview Prep</h2>
                            <button 
                                onClick={() => handleCategoryClick('technical-assessments')} 
                                className="font-semibold text-sm flex items-center gap-1 bg-transparent border-none cursor-pointer"
                                style={{ color: t.accentText }}
                            >
                                View more posts <ArrowRight size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {technicalAssessmentsPosts.map((post) => renderGridCard(post))}
                        </div>
                    </div>
                )}

                {/* ─── TECH RECRUITING SECTION ─── */}
                {aiHiringPosts.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end pb-3" style={{ borderBottom: `1px solid ${t.sectionBorder}` }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: t.headingText }}>Tech Recruiting</h2>
                            <button 
                                onClick={() => handleCategoryClick('ai-hiring')} 
                                className="font-semibold text-sm flex items-center gap-1 bg-transparent border-none cursor-pointer"
                                style={{ color: t.accentText }}
                            >
                                View more posts <ArrowRight size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {aiHiringPosts.map((post) => renderGridCard(post))}
                        </div>
                    </div>
                )}

                {/* ─── ENGINEERING SECTION ─── */}
                {engineeringHiringPosts.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end pb-3" style={{ borderBottom: `1px solid ${t.sectionBorder}` }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: t.headingText }}>Engineering</h2>
                            <button 
                                onClick={() => handleCategoryClick('engineering-hiring')} 
                                className="font-semibold text-sm flex items-center gap-1 bg-transparent border-none cursor-pointer"
                                style={{ color: t.accentText }}
                            >
                                View more posts <ArrowRight size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {engineeringHiringPosts.map((post) => renderGridCard(post))}
                        </div>
                    </div>
                )}

                {/* ─── PRODUCT UPDATES (CODESIGNAL UPDATES) ─── */}
                {productUpdatesPosts.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end pb-3" style={{ borderBottom: `1px solid ${t.sectionBorder}` }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: t.headingText }}>Product Updates</h2>
                            <button 
                                onClick={() => handleCategoryClick('product-updates')} 
                                className="font-semibold text-sm flex items-center gap-1 bg-transparent border-none cursor-pointer"
                                style={{ color: t.accentText }}
                            >
                                View more posts <ArrowRight size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {productUpdatesPosts.map((post) => renderGridCard(post))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif", background: t.pageBg, color: t.pageText, paddingTop: '72px', paddingBottom: '4rem', transition: 'background 0.4s ease, color 0.4s ease' }}>
            <style>{`
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .blog-cat-scroll::-webkit-scrollbar { display: none; }
                .blog-card-link {
                    text-decoration: none;
                    color: inherit;
                    display: flex;
                    flex-direction: column;
                    border-radius: 16px;
                    overflow: hidden;
                    background: ${t.cardBg};
                    border: 1px solid ${t.cardBorder};
                    transition: box-shadow 0.3s ease, transform 0.3s ease;
                }
                .blog-card-link:hover {
                    box-shadow: 0 8px 32px ${t.cardHoverShadow};
                    transform: translateY(-3px);
                }
                .blog-card-link:hover .blog-card-title { color: ${t.accentText} !important; }
                .blog-card-link:hover .blog-card-img { transform: scale(1.04); }
                .cat-tab-btn {
                    position: relative;
                    padding: 14px 24px;
                    font-size: 14px;
                    font-weight: 500;
                    background: none;
                    border: none;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: color 0.2s ease;
                }
                .cat-tab-btn:hover { color: ${t.tabHoverText} !important; }
                .page-btn-themed {
                    padding: 10px 22px;
                    border-radius: 10px;
                    border: 1px solid ${t.paginationBorder};
                    background: ${t.paginationBg};
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: ${t.paginationText};
                }
                .page-btn-themed:hover:not(:disabled) {
                    border-color: ${t.paginationHoverBorder};
                    color: ${t.paginationHoverText};
                    box-shadow: 0 2px 8px ${isDark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.08)'};
                }
                .page-btn-themed:disabled {
                    opacity: 0.4;
                    cursor: default;
                }
                .read-more-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                    font-weight: 600;
                    color: ${t.readMoreText};
                    transition: gap 0.2s ease;
                }
                .blog-card-link:hover .read-more-link { gap: 10px; }
                .theme-toggle-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    border: 1px solid ${isDark ? '#2a3348' : '#d1d5db'};
                    background: ${isDark ? '#1e2535' : '#ffffff'};
                    color: ${isDark ? '#fbbf24' : '#6366f1'};
                    cursor: pointer;
                    transition: all 0.3s ease;
                    flex-shrink: 0;
                }
                .theme-toggle-btn:hover {
                    background: ${isDark ? '#2a3348' : '#f1f5f9'};
                    border-color: ${isDark ? '#3b82f6' : '#6366f1'};
                    transform: rotate(15deg) scale(1.08);
                }
            `}</style>

            {/* ═══════════ CATEGORY NAVIGATION BAR ═══════════ */}
            <div style={{ maxWidth: '1340px', margin: '0 auto', padding: '0 24px' }}>
                <nav style={{
                    background: t.navBg,
                    border: `1px solid ${t.navBorder}`,
                    borderRadius: '12px',
                    marginTop: '1.5rem',
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    gap: '4px',
                }} className="blog-cat-scroll">
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        {navItems.map((item) => {
                            const active = isTabActive(item.slug);
                            return (
                                <button
                                    key={item.name}
                                    onClick={() => handleCategoryClick(item.slug)}
                                    className="cat-tab-btn"
                                    style={{
                                        color: active ? t.tabActiveText : t.tabText,
                                        fontWeight: active ? 600 : 500,
                                        flex: 1,
                                        textAlign: 'center',
                                        padding: '16px 12px',
                                    }}
                                >
                                    {item.name}
                                </button>
                            );
                        })}
                    </div>
                    {/* Theme Toggle Icon */}
                    <button
                        onClick={toggleTheme}
                        className="theme-toggle-btn"
                        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </nav>
            </div>

            {/* ═══════════ MAIN CONTENT ═══════════ */}
            <div style={{ maxWidth: '1340px', margin: '0 auto', padding: '0 24px' }}>

                {/* ═══════════ LOADING SKELETONS ═══════════ */}
                {loading && !hasCachedData() ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px', marginTop: '4rem' }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} style={{ borderRadius: '16px', overflow: 'hidden', background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                                <div style={{ height: '200px', background: t.skeletonShimmer, backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
                                <div style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ height: '12px', width: '35%', borderRadius: '6px', background: t.skeletonBg, marginBottom: '14px' }} />
                                    <div style={{ height: '18px', width: '85%', borderRadius: '6px', background: t.skeletonBg, marginBottom: '10px' }} />
                                    <div style={{ height: '14px', width: '100%', borderRadius: '6px', background: t.skeletonBg, marginBottom: '6px' }} />
                                    <div style={{ height: '14px', width: '60%', borderRadius: '6px', background: t.skeletonBg, marginBottom: '20px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activeCategory === '' ? (
                    //curated Home / "The Latest" tab view
                    renderLatestTab()
                ) : (
                    //Standard Category / All Posts view
                    <>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '3rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: `1px solid ${t.sectionBorder}` }}>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: t.headingText, margin: 0 }}>
                                {activeCategoryLabel()}
                            </h2>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                            {posts.map((post) => (
                                <Link key={post._id} to={`/blog/${post.slug}`} state={{ post }} className="blog-card-link">
                                    {/* Image */}
                                    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
                                        {post.coverImage ? (
                                            <img
                                                src={post.coverImage}
                                                alt={post.title}
                                                className="blog-card-img"
                                                style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.placeholderGradient }}>
                                                <BookOpen size={36} style={{ color: isDark ? '#60a5fa' : '#93c5fd' }} />
                                            </div>
                                        )}
                                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#0c0f16]/80 border border-white/10 text-blue-400 text-xs font-bold tracking-wider backdrop-blur-md">
                                            {getCategoryDisplayLabel(post.category)}
                                        </span>
                                    </div>

                                    {/* Body */}
                                    <div style={{ padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.accentText, marginBottom: '10px', display: 'block' }}>
                                            {getCategoryDisplayLabel(post.category)}
                                        </span>

                                        {/* Title */}
                                        <h3 className="blog-card-title" style={{
                                            fontSize: '1.05rem',
                                            fontWeight: 700,
                                            lineHeight: 1.4,
                                            color: t.headingText,
                                            marginBottom: '8px',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            transition: 'color 0.2s ease',
                                            margin: '0 0 8px 0',
                                        }}>
                                            {post.title}
                                        </h3>

                                        {/* Description */}
                                        <p style={{
                                            fontSize: '0.85rem',
                                            color: t.descText,
                                            lineHeight: 1.65,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            marginBottom: '1rem',
                                            margin: '0 0 1rem 0',
                                        }}>
                                            {post.subtitle || (post.content ? post.content.substring(0, 140).replace(/[#*`_]/g, '') + '...' : '')}
                                        </p>

                                        {/* Meta: date + reading time */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                                            <span style={{ fontSize: '12px', color: t.metaText, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Calendar size={11} /> {formatDate(post.publishedAt)}
                                            </span>
                                            <span style={{ color: t.metaDot }}>·</span>
                                            <span style={{ fontSize: '12px', color: t.metaText, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={11} /> {calculateReadTime(post.content)}
                                            </span>
                                        </div>

                                        {/* Footer */}
                                        <div style={{ marginTop: 'auto', paddingTop: '0.85rem', borderTop: `1px solid ${t.footerBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {post.authorId?.profilePic ? (
                                                    <img src={post.authorId.profilePic} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${t.cardBorder}` }} />
                                                ) : (
                                                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: t.authorBg, border: `1px solid ${t.authorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                                        <User size={12} />
                                                    </div>
                                                )}
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: t.authorText }}>Hire1Percent Team</span>
                                            </div>

                                            <span className="read-more-link">
                                                Read More <ArrowRight size={14} />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}

                        </div>

                        {/* Empty State */}
                        {posts.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: '20px', background: t.emptyBg, border: `1px solid ${t.emptyBorder}`, marginTop: '1.5rem' }}>
                                <BookOpen size={48} style={{ margin: '0 auto 16px', color: t.mutedText }} />
                                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: t.headingText, marginBottom: '4px' }}>No articles found</p>
                                <p style={{ fontSize: '0.85rem', color: t.mutedText }}>Try adjusting your category filters.</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '3rem', paddingTop: '1.5rem', borderTop: `1px solid ${t.sectionBorder}` }}>
                                <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} className="page-btn-themed">
                                    Previous
                                </button>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: t.mutedText }}>Page {page} of {totalPages}</span>
                                <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="page-btn-themed">
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

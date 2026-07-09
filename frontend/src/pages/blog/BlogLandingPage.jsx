import { useState, useEffect } from 'react';
import { getBlogPosts, getFeaturedPost, getBlogCategories, subscribeNewsletter } from '../../services/blogService';

export default function BlogLandingPage() {
    const [posts, setPosts] = useState([]);
    const [featured, setFeatured] = useState(null);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState(''); // empty means All
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Newsletter states
    const [email, setEmail] = useState('');
    const [submittingEmail, setSubmittingEmail] = useState(false);
    const [newsMsg, setNewsMsg] = useState({ text: '', type: '' });

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

        try {
            let featRes = null;
            // Fetch featured post on category All + Page 1
            if (!activeCategory && currentPage === 1) {
                featRes = await getFeaturedPost();
                setFeatured(featRes?.post || null);
            } else if (isNewCategory) {
                setFeatured(null); // hide featured on category specific pages
            }

            const res = await getBlogPosts({
                page: currentPage,
                limit: 9,
                category: activeCategory || undefined,
                search: search || undefined
            });

            // If we have a featured post, exclude it from the grid posts to avoid duplicate displays
            let gridPosts = res.posts || [];
            if (!activeCategory && currentPage === 1 && featRes?.post) {
                gridPosts = gridPosts.filter(p => p._id !== featRes.post._id);
            }

            setPosts(gridPosts);
            setTotalPages(res.pages || 1);
        } catch (err) {
            console.error("Failed to load posts:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [page, activeCategory]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchPosts(true);
    };

    const handleCategoryClick = (categorySlug) => {
        setActiveCategory(categorySlug);
    };

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;

        setSubmittingEmail(true);
        setNewsMsg({ text: '', type: '' });
        try {
            await subscribeNewsletter(email);
            setNewsMsg({ text: '🎉 Subscription successful! Welcome to the loop.', type: 'success' });
            setEmail('');
        } catch (err) {
            setNewsMsg({ text: err.message || 'Subscription failed. Please try again.', type: 'error' });
        } finally {
            setSubmittingEmail(false);
        }
    };

    // Calculate reading time helper
    const calculateReadTime = (text) => {
        if (!text) return '3 min read';
        const words = text.trim().split(/\s+/).length;
        const time = Math.ceil(words / 225); // average words per minute reading speed
        return `${time} min read`;
    };

    // Card Hover Animation Variants
    const cardVariants = {
        rest: { y: 0, scale: 1 },
        hover: { 
            y: -6, 
            scale: 1.015,
            transition: { duration: 0.25, ease: "easeOut" }
        }
    };

    const arrowVariants = {
        rest: { x: 0, y: 0, opacity: 0.6 },
        hover: { 
            x: 4, 
            y: -4, 
            opacity: 1,
            transition: { duration: 0.2, ease: "easeInOut" }
        }
    };

    return (
        <div className="min-h-screen text-white font-sans bg-[#0c0f16] selection:bg-blue-500/30 pb-28 pt-28">
            
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
            <div className="absolute top-[800px] right-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

            <div className="container mx-auto px-6 max-w-7xl">
                
                {/* Search Bar & Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-white/5 pb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-blue-400" />
                            <span className="text-xs font-black uppercase tracking-[0.3em] bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Hire1Percent Blog</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
                            AI Recruitment <span className="font-light text-white/60">& Career Tech</span>
                        </h1>
                        <p className="text-gray-400 text-sm mt-3 max-w-xl">
                            Insights, deep-dives, and guides to navigating tech interviews, resume audits, and AI-led developer talent acquisition.
                        </p>
                    </div>

                    <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search articles..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 focus:border-blue-500/40 focus:bg-white/[0.05] outline-none text-sm font-medium transition-all text-white placeholder-gray-500"
                        />
                    </form>
                </div>

                {/* Dynamic Category Pill Bar */}
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-4 mb-10 w-full whitespace-nowrap">
                    <button
                        onClick={() => handleCategoryClick('')}
                        className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${!activeCategory 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                            : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.05]'}`}
                    >
                        All Categories
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat._id}
                            onClick={() => handleCategoryClick(cat.slug)}
                            className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${activeCategory === cat.slug 
                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.05]'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Featured Post Spotlight (Hero layout) */}
                {featured && !loading && page === 1 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-14 group"
                    >
                        <Link to={`/blog/${featured.slug}`}>
                            <div className="relative rounded-[2.5rem] border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden p-6 md:p-8 flex flex-col lg:flex-row gap-8 hover:bg-white/[0.03] transition-all duration-300">
                                
                                {/* Background glow hover effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-teal-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                {/* Cover image */}
                                <div className="w-full lg:w-1/2 h-64 md:h-96 rounded-2xl overflow-hidden border border-white/5 relative shrink-0">
                                    {featured.coverImage ? (
                                        <img loading="lazy" 
                                            src={featured.coverImage} 
                                            alt="" 
                                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" 
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-900/20 to-teal-900/20 flex items-center justify-center text-white/20">
                                            <BookOpen size={48} />
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-xl bg-[#0c0f16]/85 border border-white/10 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                                        {featured.category?.name || "Spotlight"}
                                    </div>
                                </div>

                                {/* Content Details */}
                                <div className="flex-1 flex flex-col justify-between py-2">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-xs text-gray-500 font-bold uppercase tracking-wider">
                                            <span className="flex items-center gap-1"><Clock size={12} /> {calculateReadTime(featured.content)}</span>
                                            <span>·</span>
                                            <span>{new Date(featured.publishedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                                        </div>
                                        
                                        <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white group-hover:text-blue-400 transition-colors duration-300 leading-tight">
                                            {featured.title}
                                        </h2>

                                        {featured.subtitle && (
                                            <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                                                {featured.subtitle}
                                            </p>
                                        )}
                                        
                                        <div className="text-gray-500 text-xs leading-relaxed max-h-24 overflow-hidden mask-fade font-normal">
                                            {featured.content.substring(0, 180).replace(/[#*`_]/g, '')}...
                                        </div>
                                    </div>

                                    {/* Author & Footer Link */}
                                    <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-6">
                                        <div className="flex items-center gap-3">
                                            {featured.authorId?.profilePic ? (
                                                <img loading="lazy" src={featured.authorId.profilePic} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-white/10 flex items-center justify-center text-blue-400">
                                                    <User size={16} />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-extrabold text-white">{featured.authorId?.name || "Hire1Percent Editor"}</p>
                                                <p className="text-[10px] text-gray-500 font-medium">{featured.authorId?.designation || "Editorial Team"}</p>
                                            </div>
                                        </div>

                                        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-400 group-hover:text-blue-300">
                                            Read Article <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                )}

                {/* Skeletons Loader */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="rounded-3xl border border-white/5 bg-white/[0.01] p-5 space-y-4 h-[420px]">
                                <div className="h-44 rounded-2xl bg-white/5 animate-pulse" />
                                <div className="space-y-2">
                                    <div className="h-3 w-1/3 rounded bg-white/5 animate-pulse" />
                                    <div className="h-6 w-5/6 rounded bg-white/5 animate-pulse" />
                                    <div className="h-4 w-full rounded bg-white/5 animate-pulse" />
                                </div>
                                <div className="pt-6 border-t border-white/5 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
                                    <div className="flex-1 space-y-1">
                                        <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
                                        <div className="h-2 w-1/4 rounded bg-white/5 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Blog Post Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            
                            {/* Loop Grid Articles */}
                            {posts.map((post, idx) => (
                                <motion.article
                                    key={post._id}
                                    variants={cardVariants}
                                    initial="rest"
                                    whileHover="hover"
                                    animate="rest"
                                    className="rounded-[2rem] border border-white/10 bg-white/[0.01] hover:bg-white/[0.02] backdrop-blur-md overflow-hidden p-5 flex flex-col justify-between h-[440px] hover:border-blue-500/25 transition-all duration-300 cursor-pointer relative group"
                                >
                                    <Link to={`/blog/${post.slug}`} className="absolute inset-0 z-10" />
                                    
                                    <div>
                                        {/* Cover Image Container */}
                                        <div className="h-44 rounded-2xl overflow-hidden border border-white/5 relative shrink-0">
                                            {post.coverImage ? (
                                                <img loading="lazy" 
                                                    src={post.coverImage} 
                                                    alt="" 
                                                    className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300" 
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-950/20 to-teal-950/20 flex items-center justify-center text-white/10">
                                                    <BookOpen size={36} />
                                                </div>
                                            )}
                                            
                                            {/* Tag */}
                                            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#0c0f16]/80 border border-white/10 text-blue-400 text-[9px] font-black uppercase tracking-wider">
                                                {post.category?.name || "Article"}
                                            </span>
                                        </div>

                                        {/* Content info */}
                                        <div className="mt-5 space-y-2">
                                            <div className="flex items-center gap-2.5 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                                <span className="flex items-center gap-1"><Clock size={10} /> {calculateReadTime(post.content)}</span>
                                                <span>·</span>
                                                <span>{new Date(post.publishedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                                            </div>
                                            <h3 className="text-lg font-black leading-snug text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                                                {post.title}
                                            </h3>
                                            {post.subtitle && (
                                                <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">
                                                    {post.subtitle}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer Profile Details */}
                                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                                        <div className="flex items-center gap-2.5">
                                            {post.authorId?.profilePic ? (
                                                <img loading="lazy" src={post.authorId.profilePic} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-white/10 flex items-center justify-center text-blue-400">
                                                    <User size={12} />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-white truncate max-w-[120px]">{post.authorId?.name || "Hire1Percent Editor"}</p>
                                                <p className="text-[9px] text-gray-500 font-medium truncate max-w-[120px]">{post.authorId?.designation || "Editor"}</p>
                                            </div>
                                        </div>

                                        {/* Sliding indicator arrow */}
                                        <motion.div 
                                            variants={arrowVariants}
                                            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 shrink-0"
                                        >
                                            <ArrowRight size={14} className="-rotate-45" />
                                        </motion.div>
                                    </div>
                                </motion.article>
                            ))}

                            {/* Newsletter Subscription CTA Integrated Card in the Grid */}
                            {posts.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="rounded-[2rem] border border-blue-500/20 bg-gradient-to-br from-blue-600/[0.04] to-teal-500/[0.02] backdrop-blur-md overflow-hidden p-6 flex flex-col justify-between h-[440px] shadow-lg shadow-blue-950/10"
                                >
                                    <div className="space-y-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                            <Mail size={20} />
                                        </div>
                                        
                                        <h3 className="text-xl font-black text-white leading-tight">
                                            Never Miss a Tech Update
                                        </h3>
                                        <p className="text-gray-400 text-xs leading-relaxed">
                                            Subscribe to get the latest insights on technical interview structures, resume reviews, salary guides, and AI hiring trends delivered directly to your inbox.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubscribe} className="space-y-3">
                                        <div className="relative">
                                            <input
                                                type="email"
                                                required
                                                placeholder="Enter your email address"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 focus:border-blue-500/40 outline-none text-xs font-semibold text-white placeholder-gray-500"
                                                disabled={submittingEmail}
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submittingEmail}
                                            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10"
                                        >
                                            {submittingEmail ? <Loader2 size={12} className="animate-spin" /> : 'Subscribe'}
                                        </button>
                                        
                                        {/* Newsletter Success/Error messaging */}
                                        {newsMsg.text && (
                                            <div className={`text-[10px] font-bold flex items-center gap-1 ${newsMsg.type === 'success' ? 'text-teal-400' : 'text-red-400'}`}>
                                                <AlertCircle size={10} />
                                                {newsMsg.text}
                                            </div>
                                        )}
                                    </form>
                                </motion.div>
                            )}

                        </div>

                        {/* Empty results state */}
                        {posts.length === 0 && (
                            <div className="text-center py-24 bg-white/[0.01] border border-white/5 rounded-[2.5rem] text-gray-500 shadow-sm">
                                <BookOpen className="mx-auto mb-4 opacity-10" size={48} />
                                <p className="font-extrabold text-lg text-white/50">No articles available</p>
                                <p className="text-sm mt-1">Try resetting the search or category filters.</p>
                            </div>
                        )}

                        {/* Pagination controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-12 pt-6 border-t border-white/5">
                                <button
                                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                                    disabled={page === 1}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-30 disabled:hover:bg-white/[0.02] text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    Previous
                                </button>
                                <span className="text-xs font-bold text-gray-400">Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                    disabled={page === totalPages}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-30 disabled:hover:bg-white/[0.02] text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                                >
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

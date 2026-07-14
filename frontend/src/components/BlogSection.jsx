import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, BookOpen } from 'lucide-react';
import { getBlogPosts } from '../services/blogService';

const BlogSection = ({ theme = 'light' }) => {
    const isLight = theme === 'light';
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const res = await getBlogPosts({ limit: 3 });
                setBlogs(res.posts || []);
            } catch (err) {
                console.error("Failed to load featured blogs on landing page:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBlogs();
    }, []);

    return (
        <section className={`py-20 transition-colors duration-300 ${isLight ? 'bg-slate-50' : 'bg-[#0f141f] border-t border-b border-white/5'}`}>
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
                    <div>
                        <div className="inline-flex items-center space-x-2 text-xs font-semibold tracking-wider text-blue-500 uppercase mb-3">
                            <BookOpen className="w-4 h-4" />
                            <span>Insights & Articles</span>
                        </div>
                        <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            Latest from Our Tech Blog
                        </h2>
                    </div>
                    <Link
                        to="/blog"
                        className="inline-flex items-center space-x-2 mt-4 md:mt-0 text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                    >
                        <span>Explore All Articles</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className={`rounded-2xl p-6 animate-pulse ${isLight ? 'bg-white shadow-sm border border-gray-100' : 'bg-[#151922] border border-white/10'}`}>
                                <div className={`w-full h-44 rounded-xl mb-4 ${isLight ? 'bg-gray-200' : 'bg-gray-800'}`}></div>
                                <div className={`h-4 w-1/3 rounded mb-3 ${isLight ? 'bg-gray-200' : 'bg-gray-800'}`}></div>
                                <div className={`h-6 w-3/4 rounded mb-2 ${isLight ? 'bg-gray-200' : 'bg-gray-800'}`}></div>
                                <div className={`h-4 w-full rounded ${isLight ? 'bg-gray-200' : 'bg-gray-800'}`}></div>
                            </div>
                        ))}
                    </div>
                ) : blogs.length === 0 ? (
                    <div className={`p-10 rounded-2xl text-center ${isLight ? 'bg-white border border-gray-200' : 'bg-[#151922] border border-white/10'}`}>
                        <p className={`text-base ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            Check out our complete blog collection for in-depth insights on AI recruiting, tech assessments, and engineering career growth.
                        </p>
                        <Link
                            to="/blog"
                            className="inline-flex items-center space-x-2 mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
                        >
                            <span>Visit Blog Hub</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {blogs.map((post) => (
                            <Link
                                key={post._id}
                                to={`/blog/${post.slug}`}
                                className={`group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                                    isLight
                                        ? 'bg-white border border-gray-200/80 hover:shadow-xl hover:shadow-blue-500/5'
                                        : 'bg-[#151922] border border-white/10 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/10'
                                }`}
                            >
                                <div className="relative w-full h-48 overflow-hidden bg-slate-800">
                                    {post.coverImage ? (
                                        <img
                                            src={post.coverImage}
                                            alt={post.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-900 to-indigo-950 flex items-center justify-center p-6 text-center">
                                            <span className="text-white font-bold text-lg leading-snug drop-shadow">
                                                {post.title}
                                            </span>
                                        </div>
                                    )}
                                    {post.category?.name && (
                                        <span className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-blue-600/90 text-white backdrop-blur-md rounded-lg shadow-sm">
                                            {post.category.name}
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 p-6 flex flex-col justify-between">
                                    <div>
                                        <h3 className={`text-lg font-bold line-clamp-2 transition-colors group-hover:text-blue-500 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                            {post.title}
                                        </h3>
                                        {post.subtitle && (
                                            <p className={`mt-2 text-sm line-clamp-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                                {post.subtitle}
                                            </p>
                                        )}
                                    </div>

                                    <div className={`mt-6 pt-4 border-t flex items-center justify-between text-xs ${isLight ? 'border-gray-100 text-gray-500' : 'border-white/5 text-gray-400'}`}>
                                        <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
                                        <span className="flex items-center space-x-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>5 min read</span>
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default BlogSection;

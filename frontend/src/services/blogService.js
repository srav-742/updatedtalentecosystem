import { API_URL, CLIENT_ID, CLIENT_SECRET } from "../firebase";

const getHeaders = () => {
    return {
        "Content-Type": "application/json",
        "X-Client-ID": CLIENT_ID,
        "X-Client-Secret": CLIENT_SECRET
    };
};

/**
 * Get published blog posts with pagination, category filter, and search text
 */
export const getBlogPosts = async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.category) queryParams.append("category", params.category);
    if (params.search) queryParams.append("search", params.search);

    const response = await fetch(`${API_URL}/v1/blogs?${queryParams.toString()}`, {
        headers: getHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch blog posts");
    return await response.json();
};

/**
 * Get the current featured blog post
 */
export const getFeaturedPost = async () => {
    const response = await fetch(`${API_URL}/v1/blogs/featured`, {
        headers: getHeaders()
    });
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch featured post");
    }
    return await response.json();
};

/**
 * Get dynamic list of categories
 */
export const getBlogCategories = async () => {
    const response = await fetch(`${API_URL}/v1/blogs/categories`, {
        headers: getHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch categories");
    return await response.json();
};

/**
 * Get a specific blog post by slug
 */
export const getBlogPostBySlug = async (slug) => {
    const response = await fetch(`${API_URL}/v1/blogs/${slug}`, {
        headers: getHeaders()
    });
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch blog article");
    }
    return await response.json();
};

/**
 * Get related posts for a specific article ID
 */
export const getRelatedPosts = async (postId) => {
    const response = await fetch(`${API_URL}/v1/blogs/related/${postId}`, {
        headers: getHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch related posts");
    return await response.json();
};

/**
 * Subscribe to the blog newsletter (creates a Lead in the DB)
 */
export const subscribeNewsletter = async (email, name = "") => {
    const response = await fetch(`${API_URL}/v1/blogs/subscribe`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ email, name })
    });
    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to subscribe to newsletter");
    }
    return await response.json();
};

import { API_URL, CLIENT_ID, CLIENT_SECRET, getAuthHeaders } from "../firebase";

const getHeaders = () => {
    return {
        "Content-Type": "application/json",
        "X-Client-ID": CLIENT_ID,
        "X-Client-Secret": CLIENT_SECRET
    };
};

// ─── Admin Blog CRUD ───────────────────────────────────────

/**
 * Get all blog posts for admin (includes drafts & scheduled)
 */
export const getAllBlogPostsAdmin = async (params = {}) => {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.status) queryParams.append("status", params.status);

    const response = await fetch(`${API_URL}/v1/admin/blogs?${queryParams.toString()}`, { headers });
    if (!response.ok) throw new Error("Failed to fetch admin blog posts");
    return await response.json();
};

/**
 * Get a single blog post by ID (admin — includes drafts)
 */
export const getBlogPostById = async (id) => {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const response = await fetch(`${API_URL}/v1/admin/blogs/${id}`, { headers });
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch blog post");
    }
    return await response.json();
};

/**
 * Create a new blog post (admin)
 */
export const createBlogPost = async (data) => {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const response = await fetch(`${API_URL}/v1/admin/blogs`, {
        method: "POST",
        headers,
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to create blog post");
    }
    return await response.json();
};

/**
 * Update an existing blog post (admin)
 */
export const updateBlogPost = async (id, data) => {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const response = await fetch(`${API_URL}/v1/admin/blogs/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update blog post");
    }
    return await response.json();
};

/**
 * Delete a blog post (admin)
 */
export const deleteBlogPost = async (id) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/v1/admin/blogs/${id}`, {
        method: "DELETE",
        headers
    });
    if (!response.ok) throw new Error("Failed to delete blog post");
    return await response.json();
};

/**
 * Upload an image for blog (admin)
 * Returns { url: "..." }
 */
export const uploadBlogImage = async (file) => {
    const headers = await getAuthHeaders();
    // Don't set Content-Type — let browser set multipart boundary
    delete headers["Content-Type"];
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_URL}/v1/admin/blogs/upload-cover`, {
        method: "POST",
        headers,
        body: formData
    });
    if (!response.ok) throw new Error("Failed to upload image");
    return await response.json();
};

// ─── Public Blog Endpoints ─────────────────────────────────

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

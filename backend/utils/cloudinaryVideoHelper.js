const cloudinary = require("../config/cloudinary");

/**
 * Cloudinary Video Helper Utilities
 * For generating accessible video URLs and transformations
 */

/**
 * Generate a Cloudinary video URL with optional transformations
 * @param {string} publicId - The public ID of the video (e.g., "ai-interviews/video123")
 * @param {object} options - Transformation options
 * @returns {string} - Secure video URL
 */
const generateVideoUrl = (publicId, options = {}) => {
    const transformations = [];
    
    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.format) transformations.push(`f_${options.format}`);
    
    const transformationStr = transformations.length > 0 
        ? transformations.join(',') + '/' 
        : '';
    
    return cloudinary.url(publicId, {
        resource_type: 'video',
        secure: true,
        transformation: transformationStr
    });
};

/**
 * Generate HLS streaming URL for adaptive bitrate playback
 * @param {string} publicId - The public ID of the video
 * @returns {string} - HLS manifest URL
 */
const generateHLSUrl = (publicId) => {
    return cloudinary.url(publicId, {
        resource_type: 'video',
        secure: true,
        format: 'm3u8'
    });
};

/**
 * Generate embeddable video player HTML
 * @param {string} publicId - The public ID of the video
 * @param {object} options - Player options (width, height, controls, autoplay)
 * @returns {string} - HTML video element
 */
const generateVideoPlayer = (publicId, options = {}) => {
    const { width = 640, height = 480, controls = true, autoplay = false } = options;
    const videoUrl = generateVideoUrl(publicId);
    
    return `
        <video width="${width}" height="${height}" controls="${controls}" autoplay="${autoplay}">
            <source src="${videoUrl}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
    `;
};

/**
 * Get video details from Cloudinary
 * @param {string} publicId - The public ID of the video
 * @returns {Promise<object>} - Video metadata
 */
const getVideoDetails = async (publicId) => {
    try {
        const result = await cloudinary.api.resource(publicId, {
            resource_type: 'video'
        });
        
        return {
            public_id: result.public_id,
            secure_url: result.secure_url,
            duration: result.duration,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
            created_at: result.created_at,
            folder: result.folder,
            playable_url: generateVideoUrl(publicId),
            hls_url: generateHLSUrl(publicId)
        };
    } catch (error) {
        throw new Error(`Failed to get video details: ${error.message}`);
    }
};

/**
 * List all interview videos from Cloudinary
 * @param {string} folder - Folder path (default: "ai-interviews")
 * @param {number} limit - Maximum number of videos to return
 * @returns {Promise<Array>} - List of video metadata
 */
const listInterviewVideos = async (folder = "ai-interviews", limit = 100) => {
    try {
        const result = await cloudinary.api.resources({
            type: "upload",
            prefix: `${folder}/`,
            resource_type: "video",
            max_results: limit
        });

        return result.resources.map(video => ({
            public_id: video.public_id,
            secure_url: video.secure_url,
            created_at: video.created_at,
            duration: video.duration,
            format: video.format,
            bytes: video.bytes,
            playable_url: generateVideoUrl(video.public_id)
        }));
    } catch (error) {
        throw new Error(`Failed to list videos: ${error.message}`);
    }
};

module.exports = {
    generateVideoUrl,
    generateHLSUrl,
    generateVideoPlayer,
    getVideoDetails,
    listInterviewVideos
};

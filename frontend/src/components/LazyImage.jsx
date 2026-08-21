/**
 * Lazy Image Component
 * 
 * A drop-in replacement for <img> that:
 * 1. Uses native `loading="lazy"` for below-the-fold images
 * 2. Uses `decoding="async"` to avoid blocking the main thread
 * 3. Adds `fetchpriority` hints for above-the-fold images
 * 4. Automatically tries WebP version if available (with PNG/JPG fallback)
 * 5. Shows a CSS shimmer placeholder until loaded
 * 
 * Usage:
 *   import { LazyImage } from '../components/LazyImage';
 *   <LazyImage src="/ai-avatar.png" alt="AI Avatar" className="w-32 h-32" />
 *   <LazyImage src="/ai-avatar.png" alt="Hero" priority />  // above the fold
 */

import React, { useState, useRef, useEffect } from 'react';

export const LazyImage = ({
  src,
  alt = '',
  className = '',
  priority = false,
  width,
  height,
  style,
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  // Generate WebP source path
  const webpSrc = src && !src.endsWith('.svg') && !src.startsWith('http')
    ? src.replace(/\.(png|jpe?g|gif)$/i, '.webp')
    : null;

  useEffect(() => {
    // If image is already cached by browser, mark as loaded immediately
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src]);

  const handleLoad = () => setIsLoaded(true);
  const handleError = () => {
    setError(true);
    setIsLoaded(true); // Stop showing shimmer on error
  };

  const shimmerStyle = {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };

  return (
    <span
      className={`inline-block ${className}`}
      style={!isLoaded ? shimmerStyle : undefined}
    >
      {!isLoaded && !error && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      )}

      {webpSrc && !error ? (
        <picture>
          <source srcSet={webpSrc} type="image/webp" />
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchpriority={priority ? 'high' : 'auto'}
            onLoad={handleLoad}
            onError={handleError}
            className={className}
            style={{
              ...style,
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
            }}
            width={width}
            height={height}
            {...rest}
          />
        </picture>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchpriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          className={className}
          style={{
            ...style,
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
          width={width}
          height={height}
          {...rest}
        />
      )}
    </span>
  );
};

export default LazyImage;

import { ImgHTMLAttributes, useEffect, useState } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
}

/**
 * OptimizedImage component that provides WebP format support with fallbacks
 * and responsive image sizes for better mobile performance.
 * 
 * Falls back to original image if WebP is not available or supported.
 */
const OptimizedImage = ({ 
  src, 
  alt, 
  className = '', 
  loading = 'lazy',
  sizes,
  style,
  ...props 
}: OptimizedImageProps) => {
  const [imgError, setImgError] = useState(false);
  const [canUseWebp, setCanUseWebp] = useState(false);
  
  // Generate WebP source path by replacing file extension
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');

  // Probe for WebP availability to avoid broken images when the .webp file doesn't exist
  useEffect(() => {
    let cancelled = false;
    if (webpSrc !== src) {
      const testImg = new Image();
      testImg.onload = () => { if (!cancelled) setCanUseWebp(true); };
      testImg.onerror = () => { if (!cancelled) setCanUseWebp(false); };
      testImg.src = webpSrc;
    } else {
      setCanUseWebp(false);
    }
    return () => { cancelled = true; };
  }, [src, webpSrc]);
  // Default responsive sizes if not provided
  const defaultSizes = sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  if (imgError) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        sizes={defaultSizes}
        style={style}
        {...props}
      />
    );
  }

  return canUseWebp ? (
    <picture>
      <source
        srcSet={webpSrc}
        type="image/webp"
        sizes={defaultSizes}
      />
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        sizes={defaultSizes}
        style={style}
        onError={() => setImgError(true)}
        {...props}
      />
    </picture>
  ) : (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      sizes={defaultSizes}
      style={style}
      onError={() => setImgError(true)}
      {...props}
    />
  );
};

export default OptimizedImage;

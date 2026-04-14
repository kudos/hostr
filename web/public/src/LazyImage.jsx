import { useEffect, useRef } from 'react';

export default function LazyImage({ src, alt, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.src = src;
          el.classList.add('loaded');
          observer.disconnect();
        }
      },
      { rootMargin: '50px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  return <img ref={ref} alt={alt || ''} {...props} />;
}

import { useState, useRef, useLayoutEffect } from "react";

// Tracks an element's rendered width and height, for drawings laid out in pixels.
export default function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize(s => (s.width === width && s.height === height ? s : { width, height }));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

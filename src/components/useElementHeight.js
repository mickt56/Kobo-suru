import { useState, useRef, useLayoutEffect } from "react";

// Tracks an element's rendered height, so fixed-scale drawings can stretch with the window.
export default function useElementHeight() {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, height];
}

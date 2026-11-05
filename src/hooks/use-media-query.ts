import { useEffect, useState } from "react";

/** live matchMedia result; false during SSR and the first client render */
export const useMediaQuery = (query: string) => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setOn(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return on;
};

/** touch-first devices: popups wait for a tap, hints say "tap" */
export const useIsTouch = () => useMediaQuery("(pointer: coarse)");
/** phone widths: bottom dock, tighter camera */
export const useIsPhone = () => useMediaQuery("(max-width: 640px)");

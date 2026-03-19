import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  const getMatch = () => window.matchMedia(query).matches;
  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

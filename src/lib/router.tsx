import { useCallback, useEffect, useState } from "react";

function readHash(): string {
  const raw = window.location.hash.replace(/^#\/?/, "");
  return raw.split("?")[0];
}

export function navigate(to: string, options: { replace?: boolean } = {}) {
  const target = to.startsWith("#") ? to : `#/${to.replace(/^\//, "")}`;
  if (window.location.hash === target) return;
  if (options.replace) {
    window.history.replaceState(null, "", target);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = target;
  }
}

export function useRoute() {
  const [path, setPath] = useState(() => readHash());

  useEffect(() => {
    const onChange = () => {
      setPath(readHash());
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", onChange);
    if (!window.location.hash) window.history.replaceState(null, "", "#/today");
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const segments = path.split("/").filter(Boolean);
  return { path, segments };
}

export function useNavigate() {
  return useCallback((to: string) => navigate(to), []);
}

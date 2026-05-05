"use client";

import { useEffect, useState } from "react";
import { fetchObjectImage, type ObjectImage } from "@/lib/data/object-images";

type State = {
  image: ObjectImage | null;
  loading: boolean;
  error: boolean;
};

export function useObjectImage(name: string | null, kind: string | null): State {
  const [state, setState] = useState<State>({
    image: null,
    loading: false,
    error: false,
  });

  useEffect(() => {
    if (!name || !kind) {
      setState({ image: null, loading: false, error: false });
      return;
    }

    let cancelled = false;
    setState({ image: null, loading: true, error: false });

    fetchObjectImage(name, kind)
      .then((img) => {
        if (cancelled) return;
        setState({ image: img, loading: false, error: img == null });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ image: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [name, kind]);

  return state;
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ImageOff } from "lucide-react";
import { useObjectImage } from "@/hooks/useObjectImage";

type Props = {
  name: string;
  kind: string;
};

export function ObjectImageHero({ name, kind }: Props) {
  const { image, loading, error } = useObjectImage(name, kind);

  return (
    <div className="relative -mx-6 -mt-2 mb-5 h-48 overflow-hidden">
      {/* Background placeholder while loading */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#0c111f] via-[#070a14] to-[#03050b]"
        aria-hidden
      />

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/30 font-mono">
              <span className="h-1 w-1 animate-pulse rounded-full bg-gold-400" />
              loading image
            </div>
          </motion.div>
        )}

        {!loading && image && (
          <motion.img
            key={image.url}
            src={image.url}
            alt={name}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {!loading && (error || !image) && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/30"
          >
            <ImageOff className="h-6 w-6" />
            <p className="text-[10px] uppercase tracking-[0.3em] font-mono">
              no image available
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom gradient so the hero blends into the modal content */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#070a14] to-transparent"
        aria-hidden
      />

      {/* Attribution chip */}
      {!loading && image?.attribution && (
        <div className="absolute right-3 bottom-3 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-white/60 font-mono backdrop-blur-sm">
          {image.attribution}
        </div>
      )}
    </div>
  );
}

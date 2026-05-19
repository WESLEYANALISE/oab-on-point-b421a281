import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  /** Marcado como LCP — desliga lazy e prioriza decoding. */
  priority?: boolean;
  /** Mostra skeleton dourado enquanto carrega. */
  skeleton?: boolean;
};

/**
 * <img> com defaults sãos: lazy, async decode, width/height obrigatórios
 * (passe via className h-x w-y ou props), skeleton de loading e fade-in.
 *
 * Para CLS zero: use sempre dentro de um wrapper com aspect-ratio definido.
 */
export function SmartImage({
  priority = false,
  skeleton = true,
  className,
  onLoad,
  alt = "",
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {skeleton && !loaded && (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-muted to-muted/40 animate-pulse"
        />
      )}
      <img
        {...rest}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </>
  );
}

import Image from "next/image";

export function ImageWithCaption({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return <figure className="article-figure"><Image src={src} alt={alt} width={1400} height={900} sizes="(max-width: 760px) 100vw, 720px" loading="lazy" /><figcaption>{caption}</figcaption></figure>;
}

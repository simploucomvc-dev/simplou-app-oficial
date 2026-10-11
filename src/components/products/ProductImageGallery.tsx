import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { sortImages, type ProductImage } from "@/services/productImages";
import { useSignedImageUrls } from "@/hooks/useSignedImageUrls";

export default function ProductImageGallery({ images, alt }: { images: ProductImage[] | undefined; alt: string }) {
  const sorted = sortImages(images);
  const urls = useSignedImageUrls(sorted.map((img) => img.path));
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  if (sorted.length === 0) return null;

  return (
    <div>
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {sorted.map((img, index) => (
            <CarouselItem key={img.id}>
              <div className="aspect-square w-full rounded-2xl overflow-hidden bg-muted">
                {urls[img.path] && (
                  <img
                    src={urls[img.path]}
                    alt={sorted.length > 1 ? `${alt} – foto ${index + 1}` : alt}
                    width={img.width}
                    height={img.height}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {sorted.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {sorted.map((img, index) => (
            <button
              key={img.id}
              type="button"
              onClick={() => api?.scrollTo(index)}
              className={cn("w-2 h-2 rounded-full transition-colors", index === current ? "bg-brand-primary" : "bg-muted-foreground/30")}
              aria-label={`Ver foto ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

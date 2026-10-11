import { useRef } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Camera, ImagePlus, Loader2, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { IMAGE_INPUT_ACCEPT } from "@/lib/images/processImage";
import { MAX_IMAGES_PER_PRODUCT } from "@/services/productImages";
import { useSignedImageUrls } from "@/hooks/useSignedImageUrls";
import type { DraftImage, useProductImagesDraft } from "@/hooks/useProductImagesDraft";

type Draft = ReturnType<typeof useProductImagesDraft>;

function SortableImage({
  item,
  src,
  isCover,
  onRemove,
  onMakeCover,
}: {
  item: DraftImage;
  src?: string;
  isCover: boolean;
  onRemove: () => void;
  onMakeCover: () => void;
}) {
  const disabled = item.kind === "processing";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative aspect-square rounded-xl overflow-hidden border border-border bg-muted select-none [-webkit-touch-callout:none]",
        isDragging && "z-10 shadow-lg ring-2 ring-brand-primary",
      )}
      {...attributes}
      {...listeners}
      aria-label={isCover ? "Foto de capa. Arraste para reordenar" : "Foto. Arraste para reordenar"}
    >
      {src && <img src={src} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />}

      {item.kind === "processing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {isCover && (
        <span className="absolute bottom-1 left-1 text-[10px] font-semibold bg-brand-primary text-white px-1.5 py-0.5 rounded-full">
          Capa
        </span>
      )}

      {!disabled && (
        <>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={onRemove}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            aria-label="Remover foto"
          >
            <X size={14} />
          </button>
          {!isCover && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={onMakeCover}
              className="absolute bottom-1 left-1 h-6 px-1.5 rounded-full bg-black/60 text-white text-[10px] font-semibold flex items-center gap-1 hover:bg-black/80"
              aria-label="Definir como capa"
            >
              <Star size={10} /> Capa
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function ProductImagesField({ draft }: { draft: Draft }) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const existingThumbs = draft.items.flatMap((it) => (it.kind === "existing" ? [it.image.thumb_path] : []));
  const signedUrls = useSignedImageUrls(existingThumbs);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // No toque, segurar um instante antes de arrastar pra não brigar com a rolagem
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over && event.active.id !== event.over.id) draft.move(String(event.active.id), String(event.over.id));
  };

  const handleFiles = async (fileList: FileList | null, input: HTMLInputElement | null) => {
    const files = Array.from(fileList ?? []);
    if (input) input.value = "";
    if (files.length === 0) return;
    const errors = await draft.addFiles(files);
    [...new Set(errors)].forEach((msg) => toast.error(msg));
  };

  const srcFor = (item: DraftImage) => (item.kind === "existing" ? signedUrls[item.image.thumb_path] : item.previewUrl);
  const adding = draft.isProcessing;

  return (
    <div>
      <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">
        Fotos <span className="text-xs font-normal text-muted-foreground">(opcional, até {MAX_IMAGES_PER_PRODUCT})</span>
      </Label>

      {draft.items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={draft.items.map((it) => it.key)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {draft.items.map((item, index) => (
                <SortableImage
                  key={item.key}
                  item={item}
                  src={srcFor(item)}
                  isCover={index === 0}
                  onRemove={() => draft.remove(item.key)}
                  onMakeCover={() => draft.makeCover(item.key)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {draft.items.length > 1 && (
        <p className="text-[11px] text-muted-foreground mb-2">Segure e arraste para mudar a ordem. A primeira é a capa.</p>
      )}

      {draft.canAddMore && (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-10 gap-2 text-xs" disabled={adding} onClick={() => cameraInputRef.current?.click()}>
            <Camera size={15} /> Tirar foto
          </Button>
          <Button type="button" variant="outline" className="h-10 gap-2 text-xs" disabled={adding} onClick={() => galleryInputRef.current?.click()}>
            <ImagePlus size={15} /> Galeria ou arquivos
          </Button>
        </div>
      )}

      {/* capture abre a câmera direto no celular; no computador é ignorado e abre o seletor */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, e.target)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={IMAGE_INPUT_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, e.target)}
      />
    </div>
  );
}

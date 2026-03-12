import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface Props {
    open: boolean;
    imageSrc: string;
    onClose: () => void;
    onCropped: (croppedBlob: Blob) => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageSrc;
    });

    const canvas = document.createElement("canvas");
    const size = Math.min(pixelCrop.width, pixelCrop.height);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        size,
        size
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas is empty"));
        }, "image/jpeg", 0.9);
    });
}

export default function AvatarCropModal({ open, imageSrc, onClose, onCropped }: Props) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [processing, setProcessing] = useState(false);

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleConfirm = async () => {
        if (!croppedAreaPixels) return;
        setProcessing(true);
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropped(blob);
            onClose();
        } catch {
            // ignore
        }
        setProcessing(false);
    };

    const handleReset = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Ajustar foto de perfil</DialogTitle>
                </DialogHeader>

                {/* Cropper area */}
                <div className="relative w-full h-72 rounded-xl overflow-hidden bg-black">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                    />
                </div>

                {/* Zoom slider */}
                <div className="space-y-2 px-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Zoom</span>
                        <span>{Math.round((zoom - 1) * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ZoomOut size={18} />
                        </button>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.01}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 accent-brand-primary"
                        />
                        <button
                            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ZoomIn size={18} />
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                    <Button variant="ghost" size="icon" onClick={handleReset} title="Resetar">
                        <RotateCcw size={16} />
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        className="flex-1 bg-brand-primary hover:bg-brand-hover text-white"
                        onClick={handleConfirm}
                        disabled={processing}
                    >
                        {processing ? "Processando..." : "Confirmar"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

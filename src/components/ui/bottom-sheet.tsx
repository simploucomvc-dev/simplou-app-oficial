import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { X } from "lucide-react";
import { Button } from "./button";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  children,
  footer,
}: BottomSheetProps) {
  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 bg-black/45 z-50" />
        <DrawerPrimitive.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl outline-none flex flex-col max-h-[85vh]">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 shrink-0">
            <span className="text-base font-semibold">{title}</span>
            <DrawerPrimitive.Close asChild>
              <button className="text-gray-400 hover:text-gray-600 p-1 transition-colors">
                <X size={20} />
              </button>
            </DrawerPrimitive.Close>
          </div>

          {/* Search */}
          {onSearchChange !== undefined && (
            <div className="px-4 pb-3 shrink-0">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus={false}
                tabIndex={-1}
                className="w-full bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none"
              />
            </div>
          )}

          {/* Content */}
          <div
            className="overflow-y-scroll flex-1"
            style={{
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
              overscrollBehavior: "contain",
            }}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-4 border-t border-gray-100 shrink-0">
              {footer}
            </div>
          )}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}

export function BottomSheetClose({ children }: { children: React.ReactNode }) {
  return <DrawerPrimitive.Close asChild>{children}</DrawerPrimitive.Close>;
}

export function BottomSheetTrigger({ children }: { children: React.ReactNode }) {
  return <DrawerPrimitive.Trigger asChild>{children}</DrawerPrimitive.Trigger>;
}

import * as React from "react"
import { Maximize2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface ExpandableInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    modalTitle?: string;
    isInput?: boolean;
}

const ExpandableInput = React.forwardRef<HTMLTextAreaElement, ExpandableInputProps>(
    ({ className, modalTitle = "Editar descrição", isInput = false, ...props }, ref) => {
        const [expanded, setExpanded] = React.useState(false)
        const modalTextareaRef = React.useRef<HTMLTextAreaElement>(null)

        React.useEffect(() => {
            if (expanded && modalTextareaRef.current) {
                modalTextareaRef.current.focus()
                const len = modalTextareaRef.current.value.length
                modalTextareaRef.current.setSelectionRange(len, len)
            }
        }, [expanded])

        return (
            <>
                <div className="relative group">
                    <textarea
                        ref={ref}
                        rows={isInput ? 1 : props.rows || 3}
                        className={cn(
                            "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none pr-8",
                            isInput ? "h-11 min-h-[44px] py-2.5" : "min-h-[80px]",
                            className
                        )}
                        {...props}
                    />
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="absolute bottom-2 right-2 p-1 rounded-md text-muted-foreground hover:text-brand-hover hover:bg-brand-light transition-all"
                        title="Expandir"
                    >
                        <Maximize2 size={13} strokeWidth={2.5} />
                    </button>
                </div>

                <Dialog open={expanded} onOpenChange={setExpanded}>
                    <DialogContent className="sm:max-w-2xl h-[60vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl">
                        <DialogHeader className="px-5 py-4 border-b border-border bg-muted/30">
                            <DialogTitle className="text-base font-semibold">{modalTitle}</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 p-5 bg-background">
                            <textarea
                                {...props}
                                ref={modalTextareaRef}
                                className="w-full h-full border-0 bg-transparent text-base focus-visible:outline-none resize-none placeholder:text-muted-foreground leading-relaxed"
                                placeholder={props.placeholder}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        )
    }
)
ExpandableInput.displayName = "ExpandableInput"

export { ExpandableInput }

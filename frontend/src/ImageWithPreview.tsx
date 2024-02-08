import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "./components/ui/dialog";
import { AspectRatio } from "./components/ui/aspect-ratio";

export const ImageWithPreview = ({ image }: { image: File }) => {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen} defaultOpen={false}>
            <DialogTrigger asChild>
                <div
                    onClick={() => {
                        setOpen(true);
                    }}
                    className="h-auto max-w-full w-full flex flex-col items-center justify-center gap-1">
                    <div className="relative mt-1 flex h-auto w-full max-w-lg items-center justify-center overflow-hidden bg-gray-100 text-token-text-tertiary dark:bg-gray-700">
                        <AspectRatio ratio={16 / 9} className="">
                            <img
                                src={URL.createObjectURL(image)}
                                alt="image"
                                className="object-cover max-w-full transition-opacity duration-300 opacity-100 rounded-md backdrop-blur-sm shadow-lg overflow-hidden" />
                        </AspectRatio>
                    </div>

                </div>
            </DialogTrigger>
            <DialogContent className="border-none bg-none border-0 bg-transparent top-[35%]">
                {/* <AspectRatio ratio={16 / 9} className="w-full h-full"> */}
                <img src={URL.createObjectURL(image)} alt="image" className="object-cover max-w-full w-full h-full" />
                {/* </AspectRatio> */}
            </DialogContent>
        </Dialog>
    )
}
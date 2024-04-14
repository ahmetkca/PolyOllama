import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogPortal, DialogTitle } from "./components/ui/dialog";
import { Textarea } from "./components/ui/textarea";
import { Button } from "./components/ui/button";
import { AlertTriangle, Paperclip, X } from "lucide-react";
import { asyncConvertFileToUint8Array, cn, } from "./lib/utils";
import { useOllamaClientsStore } from "./stores/use-ollama-clients-store";


import { nanoid } from "nanoid";
import { toast } from "sonner";
import { Badge } from "./components/ui/badge";
import { useOperatingSystem } from "./hooks/use-operating-system";

const DisplayImages = (
    {
        images,
        onRemoveImage
    }: {
        images: { image: File; id: string; }[];
        onRemoveImage: (imageId: string) => void;
    }
) => {


    return (
        //
        <div className="mx-2 mt-2 flex flex-wrap gap-2 px-2.5 md:pl-0 md:pr-4">
            {images.map((image, index) => (
                <div key={index} className="group relative inline-block text-sm text-black/70 dark:text-white/90">
                    <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600">
                        <div className="w-14 h-14">
                            <img
                                src={URL.createObjectURL(image.image)}
                                alt={image.image.name}
                                className="w-full h-full object-cover rounded-md"
                            />
                        </div>
                    </div>
                    <button
                        className="absolute right-1 top-1 -translate-y-1/2 translate-x-1/2 rounded-full border border-white bg-gray-500 p-0.5 text-white transition-colors hover:bg-black hover:opacity-100 group-hover:opacity-100 md:opacity-0"
                        onClick={() => {
                            onRemoveImage(image.id);
                        }}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}


const AddImage = (
    {
        onSelectedImagesChange
    }: {
        onSelectedImagesChange: (images: File[]) => void;
    }
) => {


    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            onSelectedImagesChange(Array.from(files));
        }
    }


    const handleSelectImageFileButtonClick = () => {
        fileInputRef.current?.click();
    }

    return (
        <div className="flex flex-col justify-center items-center">
            <input
                ref={fileInputRef}
                type="file"
                multiple={false}
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
            />
            <div className="flex flex-row justify-center items-center">
                <Button
                    variant="ghost"
                    size={'icon'}
                    onClick={handleSelectImageFileButtonClick}
                >
                    <Paperclip className="h-[18px] w-[18px]" />
                </Button>
            </div>
        </div>

    )
}




export const ChatSend = ({
    disabled = false,
    onSend,
    chat,
}: {
    disabled?: boolean;
    onSend?: (msg: string, images: {
        converted: Uint8Array,
        file: File
    }[] | undefined) => Promise<void>;
    chat: {
        conversations: {
            endpoint: string | null;
            conversation_id: number;
            model: string;
            chat_id: number;
            endpoint_id: number | null;
        }[];
        chat_id: number;
        title: string;
    } | undefined;
}) => {

    const [images, setImages] = useState<{
        image: File;
        id: string;
    }[]>([]);

    const operatingSystem = useOperatingSystem();

    const {
        endpoints,
        endpointsSelectedModel,
    } = useOllamaClientsStore((state) => state);

    const numOfEndpointsWithoutModel = endpoints.filter((endpoint) => (endpointsSelectedModel.get(endpoint) === "" || endpointsSelectedModel.get(endpoint) === undefined)).length;

    // const { isConnected, socket } = useWebSocket();

    const textArea = useRef<HTMLTextAreaElement>(null);

    const [dialogOpen, setDialogOpen] = useState(false);

    // const [model, setModel] = useState<string | undefined>(undefined);

    const handleMessageSend = () => {
        if (!textArea.current) {
            // console.log("textArea.current is null");
            toast.error("Prompt cannot be empty.");
            return; // no empty messages allowed
        }
        if (numOfEndpointsWithoutModel > 0) {
            // console.log("All conversations must have a model selected before sending a message.");
            toast.error("All conversations must have a model selected before sending a message.");
            return;
        }

        // console.log(`SENDING ${images.length} images`);
        if (images.length === 0) {
            onSend?.(textArea.current.value, undefined);
            textArea.current!.value = "";
        } else if (images.length > 0) {
            Promise.all(
                images.map((image) => {

                    return (async () => ({
                        file: image.image,
                        converted: await asyncConvertFileToUint8Array(image.image),
                    }))();

                })
            ).then((imagesConverted) => {
                (async () => {
                    await onSend?.(textArea.current!.value, imagesConverted);
                    setImages([]);
                    textArea.current!.value = "";
                })();
            });
        }
    }

    useEffect(() => {
        if (dialogOpen) {
            textArea.current?.focus();
        }
    }, [dialogOpen]);

    const handleKeyDown = (event: KeyboardEvent) => {
        console.log(event);
        if (event.key === "k" &&
            ((operatingSystem === 'macOS' && event.metaKey) ||
                (operatingSystem === 'Windows' && event.altKey) ||
                (operatingSystem === 'Linux' && event.altKey))
        ) {
            setDialogOpen((open) => !open);
        } else if (event.key === "Enter" &&
            ((operatingSystem === 'macOS' && event.metaKey) ||
                (operatingSystem === 'Windows' && event.altKey) ||
                (operatingSystem === 'Linux' && event.altKey))
        ) {
            handleMessageSend();
            setDialogOpen(false);
        }
    };

    useEffect(() => {
        // Cmd + k to open/close dialog

        if (disabled) {
            // console.log(`Chat send dialog is disabled. Skipping event listener setup.`);
            return;
        }

        if (endpoints.length === 0) {
            // console.log(`No endpoints found. Skipping event listener setup. Opening chat send dialog is disabled.`)
            return;
        }



        document.addEventListener("keydown", handleKeyDown);

        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown, endpoints, disabled]);


    return (
        <Dialog

            open={dialogOpen} defaultOpen={false} onOpenChange={(open) => setDialogOpen(open)}>
            <DialogPortal>
                <DialogContent className="max-w-3xl top-[25%]">
                    <DialogHeader>
                        <DialogTitle>
                            <span className="text-lg font-bold text-[rgb(64,64,64)] dark:text-white">
                                Send a message
                            </span>
                        </DialogTitle>
                        <DialogDescription>
                            {/* {socket.current ?
                                // following function return OPEN, CLOSED, CLOSING, CONNECTING
                                websocketReadyStateToString(socket.current.readyState).charAt(0).toUpperCase() + websocketReadyStateToString(socket.current.readyState).slice(1).toLowerCase()
                                :
                                "Connecting..."
                            } */}
                            <div className="flex flex-wrap gap-2">
                                {chat === undefined && endpoints.map((ep) => {
                                    const mdl = endpointsSelectedModel.get(ep);
                                    // console.log(`mdl`, typeof mdl)
                                    if (mdl === undefined || mdl === "") {
                                        return null;
                                    }
                                    return (
                                        <div key={ep} className="flex flex-row justify-center items-center gap-1">
                                            <Badge variant={'outline'}>
                                                <span className="text-sm font-bold text-[rgb(64,64,64)] dark:text-white">
                                                    {mdl}
                                                </span>
                                            </Badge>
                                        </div>
                                    )
                                })

                                }
                                {chat !== undefined && chat.conversations.map((conv, index) => {
                                    // console.log("conv.endpoint", conv.endpoint);
                                    // console.log(endpointsSelectedModel)
                                    if (conv.endpoint_id === null || conv.endpoint === null) {
                                        return null;
                                    }
                                    const model = endpointsSelectedModel.get(conv.endpoint);
                                    // console.log("model", model);
                                    return (
                                        <div key={index} className="flex flex-row justify-center items-center gap-1">
                                            <Badge variant={'outline'}>
                                                <span className="text-sm font-bold text-[rgb(64,64,64)] dark:text-white">
                                                    {model}
                                                </span>
                                            </Badge>
                                        </div>
                                    )
                                })}
                                {/* check how many conversations's endpoint has no model selected. */}
                                {numOfEndpointsWithoutModel > 0 && (
                                    <div className="flex flex-row justify-center items-center gap-1">
                                        <Badge variant={'outline'} className="border-red-400 flex flex-row justify-center items-center gap-1">
                                            <AlertTriangle className="h-4 w-4 text-red-400" />
                                            <span className="text-sm font-bold text-red-400">
                                                {numOfEndpointsWithoutModel} conversation{numOfEndpointsWithoutModel > 1 ? "s" : ""} without model
                                            </span>
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </DialogDescription>
                        {/* there is gonna be textarea and when i enter I should do something */}
                        <div className="flex flex-col pb-4 pt-1 px-0 gap-y-2.5">
                            <DisplayImages images={images}
                                onRemoveImage={(imageId) => {
                                    setImages(images.filter((image) => image.id !== imageId));
                                }}
                            />
                            <Textarea
                                ref={textArea}
                                placeholder="Type your prompt here..."
                                className="relative w-full h-full rounded-md shadow-lg bg-gradient-to-r from-[#f0f0f0] to-[#f1f1f1] border-[#f5f5f5] border-2 border-opacity-10"
                            >
                            </Textarea>

                            <div className="flex flex-row justify-start items-center">
                                <div className="flex flex-row justify-start space-x-1">
                                    {/* <SelectModel
                                        modelName={model}
                                        onModelChange={(model) => {
                                            // console.log("model", model);
                                            setModel(model);
                                            // setSelectedModelForAllEndpoints(model);
                                        }}
                                    /> */}
                                    <AddImage onSelectedImagesChange={(images) => {
                                        setImages((prevImages) => {
                                            return [
                                                ...prevImages,
                                                ...images.map((image) => ({ image, id: nanoid() }))
                                            ];
                                        });
                                    }} />
                                </div>
                                <div className="flex flex-1 flex-grow"></div>
                                <div
                                    className={
                                        cn("flex flex-row justify-end",
                                            disabled ? "opacity-50 pointer-events-none" : "opacity-100 pointer-events-auto"
                                        )}
                                >
                                    Press{" "}
                                    <div className="flex flex-row justify-center items-center mx-1">

                                        <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                            <span className="text-base">⌘</span>
                                        </kbd>
                                        <span className="text-xs mx-0.5">+</span>
                                        <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                            <span className="text-xl mb-[1px]">↩</span>
                                        </kbd>
                                    </div>
                                    {" "}
                                    to send
                                </div>
                            </div>
                        </div>
                    </DialogHeader>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    )
}
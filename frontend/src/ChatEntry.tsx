import React, { FC } from "react";
import { useChatEntriesStore } from "./stores/use-chat-entries";
import { ImageWithPreview } from "./ImageWithPreview";
import { Skeleton } from "./components/ui/skeleton";
import { Info, RotateCcw } from "lucide-react";
import { cn } from "./lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";


type InfoDisplayProps = {
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    prompt_eval_duration: number
    prompt_eval_rate: number;
    eval_count: number;
    eval_duration: number;
    eval_rate: number;
}

const InfoDisplay: FC<Partial<InfoDisplayProps>> =
    ({
        total_duration,
        load_duration,
        prompt_eval_count,
        prompt_eval_duration,
        prompt_eval_rate,
        eval_count,
        eval_duration,
        eval_rate
    }) => {
        return (
            <div
                className={cn(
                    "flex flex-col gap-1 p-2",
                )}>
                <div className="grid grid-rows-1">
                    <div className="grid grid-cols-2 gap-1">
                        <span className="font-semibold ">Total Duration:</span>{" "}
                        <span>{total_duration?.toFixed(3)}s</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        <span className="font-semibold ">Load Duration:</span>{" "}
                        <span>{load_duration?.toFixed(3)}s</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        <span className="font-semibold ">Prompt Eval Count:</span>{" "}
                        <span>{prompt_eval_count}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        <span className="font-semibold ">Prompt Eval Duration:</span>{" "}
                        <span>{prompt_eval_duration?.toFixed(3)}s</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        <span className="font-semibold ">Prompt Eval Rate:</span>{" "}
                        <span>{prompt_eval_rate?.toFixed(3)} tokens/s</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        <span className="font-semibold ">Eval Count:</span>{" "}
                        <span>{eval_count}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        <span className="font-semibold ">Eval Duration:</span>{" "}
                        <span>{eval_duration?.toFixed(3)}s</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        <span className="font-semibold ">Eval Rate:</span>{" "}
                        <span>{eval_rate?.toFixed(3)} tokens/s</span>
                    </div>
                </div>
            </div>
        )
    }


interface ChatEntryProps {
    id: string;
    endpoint: string;
};

const ChatEntry: FC<ChatEntryProps> = ({ id, endpoint }) => {

    const {
        allChatEntries,
        getChatEntriesIndexByEndpoint,
    } = useChatEntriesStore((state) => {
        return {
            allChatEntries: state.allChatEntries,
            getChatEntriesIndexByEndpoint: state.getChatEntriesIndexByEndpoint,
        };
    });

    const chatEntriesIndex = getChatEntriesIndexByEndpoint(endpoint);
    const chatEntries = allChatEntries[chatEntriesIndex];
    const chatEntry = chatEntries.find((entry) => entry.id === id);

    if (!chatEntry) {
        return <div>Chat entry not found</div>;
    }

    const { message, model } = chatEntry;

    return (
        <div className="w-full h-full text-[#0f0f0f]">
            <div className="px-4 py-2 justify-center text-base md:gap-6 m-auto">

                <div className="flex flex-1 text-base mx-auto gap-3 md:px-5 lg:px-1 xl:px-5 md:max-w-3xl lg:max-w-[40rem] xl:max-w-[48rem] group">
                    {/* there are going to be multipe of the following div. But only the last one should be sticky to the top once it is scroolable */}
                    <div className="flex-shrink-0 flex flex-col relative items-end">
                        {message.role === "assistant" && (
                            <img
                                className=" w-8 rounded-full object-cover"
                                src="https://ollama.ai/public/ollama.png"
                                alt="Ollama"
                            />
                        )}
                        {message.role === "user" && (
                            <div className="h-8 w-8 rounded-full bg-[#AfBfCf] group-hover:bg-[#0f0f0f] transition-colors duration-300 ease-in-out"></div>
                        )}
                    </div>
                    <div className="relative flex w-full flex-col lg:w-[calc(100%-5px)]">
                        <div className="font-semibold select-none">{message.role === "user" ? "You" : model}</div>
                        <div className="relative flex w-full flex-col lg:w-[calc(100%-5px)] agent-turn">
                            <div className=" flex-col  gap-1 md:gap-3"> {/* flex flex-1 flex-grow */}
                                <div className="flex flex-grow flex-col max-w-full">
                                    <div className="min-h-[20px] text-message flex flex-col items-start gap-3 whitespace-pre-wwrap breakk-words [.text-message+&]:mt-5 overflow-x-auto">
                                        {message.images && message.images.length > 0 &&
                                            message.images.map((image, i) => (
                                                <ImageWithPreview
                                                    key={`${image.name}-${i}-${image.lastModified}-${image.size}`}
                                                    image={image} />

                                            ))}
                                        <div className="markdown prose w-full breakk-words dark:prose-invert light">
                                            {/* DEBUG */}

                                            <p className="text-xs font-light">{endpoint}</p>
                                            <p className="text-xs font-light">{id}</p>


                                            <p className="text-[#0f0f0f] w-full whitespace-pre-wrap break-words paragraph">
                                                {message.content}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* here show info, ask if the response was good or bad, regenerate, copy? */}
                                <div className="flex flex-row justify-start items-center gap-1.5 mt-1.5">
                                    {chatEntry.message.role === 'assistant' &&
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <div className="flex-none">
                                                        <Info size={14} color="#9b9b9b" />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <InfoDisplay
                                                        {...chatEntry.message}
                                                    />
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    }


                                    {/* only allow regenerate if this is the last assistant message */}
                                    {/* <div className="flex-none">
                                        <RotateCcw size={14} color="#9b9b9b" />
                                    </div> */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};





export const ChatEntrySkeleton: FC = () => {
    return (
        <div className="w-full h-full text-[#0f0f0f]">
            <div className="px-4 py-2 justify-center text-base md:gap-6 m-auto">

                <div className="flex flex-1 text-base mx-auto gap-3 md:px-5 lg:px-1 xl:px-5 md:max-w-3xl lg:max-w-[40rem] xl:max-w-[48rem] group">
                    <div className="flex-shrink-0 flex flex-col relative items-end">
                        <div className="animate-in transition-all duration-1000 ease-linear delay-100">
                            <Skeleton className="w-8 h-8 rounded-full object-cover bg-gray-200" />
                        </div>
                    </div>
                    <div className="relative flex w-full flex-col lg:w-[calc(100%-5px)]">
                        <Skeleton className="w-20 h-3 mb-1 bg-slate-200" />
                        <div className="relative flex w-full flex-col lg:w-[calc(100%-5px)] agent-turn">
                            <div className="flex flex-col flex-1 flex-grow gap-1 md:gap-3">
                                <div className="flex flex-grow flex-col max-w-full">
                                    <div className="min-h-[20px] text-message flex flex-col items-start gap-3 whitespace-pre-wwrap breakk-words [.text-message+&]:mt-5 overflow-x-auto">
                                        <div className="markdown prose w-full breakk-words dark:prose-invert light">
                                            <Skeleton className="w-1/2 h-2.5 mb-1 bg-gray-200" />
                                            <Skeleton className="w-3/4 h-2.5 mb-0.5 bg-neutral-200" />
                                            <Skeleton className="w-full h-2.5 mb-1 bg-gray-200" />
                                            <Skeleton className="w-4/5 h-2.5 mb-1 bg-neutral-200" />
                                            <Skeleton className="w-1/2 h-2.5 mb-0.5 bg-gray-200" />
                                            <Skeleton className="w-3/4 h-2.5 mb-1 bg-neutral-200" />
                                            <Skeleton className="w-full h-2.5 mb-1 bg-gray-200" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
}


export default ChatEntry;
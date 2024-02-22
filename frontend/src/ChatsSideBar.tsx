import { useState } from "react";
import { useChatDelete, useChats } from "./hooks/use-chats";
import { cn } from "./lib/utils";
import { Button } from "./components/ui/button";
import { Bot, MessagesSquare, MoreHorizontal, PencilLine, Server, SquarePen, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import { useHover } from "./hooks/use-hover";
import { ChatTitle } from "./ChatTitle";


const ChatSideBarItem = ({
    active,
    chat,
    onChatSelect,
}: {
    active: boolean;
    chat: {
        conversations: {
            conversation_id: number;
            model: string;
            chat_id: number;
            endpoint_id: number | null;
        }[];
        chat_id: number;
        title: string;
    };
    onChatSelect: (chatId?: number) => void;
}) => {

    const {
        trigger: deleteChat
    } = useChatDelete();

    const [ref, isHovered] = useHover();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);


    return (
        <div
            ref={ref}
            className={
                cn(
                    "flex flex-col gap-2 pl-2.5 pr-2 py-2 border rounded-md border-transparent hover:border-[rgb(48,48,48)] mmrr-1.5",
                    isHovered || active ? "bg-[rgb(48,48,48)] border-[rgb(64,64,64)] cursor-pointer" : "bg-transparent",
                )
            }
            onClick={() => onChatSelect(chat.chat_id)}
        >
            <div className="flex flex-row">
                <div className="relative grow overflow-hidden whitespace-nowrap text-[rgb(240,240,240)] select-none">
                    {/* {chat.title} */}
                    <ChatTitle
                        chatId={chat.chat_id}
                        chatTitle={chat.title}
                        location={`chat_id_${chat.chat_id}_sidebar_item`}
                    />
                    <div
                        className={
                            cn("absolute bottom-0 right-0 top-0 w-24",
                                isHovered || active ? "bg-gradient-to-r from-transparent to-[rgb(48,48,48)]" : "bg-gradient-to-r from-transparent to-[rgb(27,27,27)]"

                            )}
                    >
                    </div>
                </div>

                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    {active === true || isHovered === true || isPopoverOpen === true ? (
                        <PopoverTrigger asChild>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsPopoverOpen((prev) => !prev);
                                }}
                            >
                                <MoreHorizontal className="h-5 w-5 flex-shrink-0" />
                            </button>

                        </PopoverTrigger>) : null}

                    {isPopoverOpen && (<PopoverContent className="w-48 h-full p-1.5" side="bottom" align="start">
                        <div className="flex flex-col space-y-0.5">
                            <div className="flex justify-start items-center gap-2 p-3 mm-1.5 rounded text-sm cursor-pointer focus:ring-0 border border-transparent hover:border-[rgb(224,224,224)] hover:bg-[rgb(236,236,236)] text-[rgb(18,18,18)]">
                                <PencilLine className="w-4 h-4" />
                                <span>Rename</span>
                            </div>
                            <button
                                className="flex justify-start items-center gap-2 p-3 mm-1.5 rounded text-sm cursor-pointer focus:ring-0 border border-transparent hover:border-[rgb(224,224,224)] text-red-500 hover:bg-[rgb(236,236,236)]"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteChat({
                                        chatId: chat.chat_id,
                                    }).then(() => {
                                        // console.log(`chat ${chat.chat_id} deleted`);
                                        onChatSelect(undefined);
                                    })
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete chat</span>
                            </button>
                        </div>
                    </PopoverContent>)}
                </Popover>
            </div>
            <div className="flex justify-start items-center">
                <div className="flex flex-row gap-1.5 items-center justify-start">
                    <MessagesSquare className="h-4 w-4" color="#828282" />
                    <div className="flex flex-row gap-0.5 items-center justify-start">
                        <span className="text-[#828282] text-sm">{chat.conversations.length}</span>
                        <span className="text-[#828282] text-sm">conversations</span>
                    </div>
                </div>
                <div className="flex-grow">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex flex-row gap-1.5 items-center justify-end">
                                    <Bot className="h-4 w-4" color={'#828282'} />
                                    <div className="flex flex-row gap-0.5 items-center justify-start ">
                                        <span className="text-[#828282] text-sm">{new Set(chat.conversations.map((conv) => conv.model)).size}</span>
                                        <span className="text-[#828282] text-sm">models</span>
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent align="end" side="bottom" className="z-50">
                                <p className="font-semibold text-sm text-[rgb(48,48,48)]">Unique models</p>
                            </TooltipContent>
                        </Tooltip>

                    </TooltipProvider>
                </div>
            </div>

            {/* <DropdownMenu>
                
                <div className={
                    cn(
                        "flex-shrink-0 transition-opacity duration-300 ease-in-out",
                    )
                }>
                    <div className="flex flex-row justify-center items-center">
                        <DropdownMenuTrigger asChild>

                            <button
                                className={
                                    cn(
                                        "flex justify-center items-center pt-[2.5px]",
                                        // isHovered || active ? " text-[rgb(240,240,240)] hover:text-[rgb(240,240,240)]" : "text-[rgb(240,240,240)] hover:text-[rgb(240,240,240)]"
                                    )
                                }
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            >
                                <MoreHorizontal className="h-5 w-5 flex-shrink-0" />
                            </button>


                        </DropdownMenuTrigger>
                    </div>
                </div>
                
                <DropdownMenuContent align="start" className="">
                    <DropdownMenuItem
                        className="flex gap-2 m-0.5 p-2 rounded  text-sm cursor-pointer focus:ring-0 hover:bg-[rgb(240,240,240)] hover:text-[rgb(18,18,18)]"
                        onClick={(e) => {
                            e.stopPropagation();
                            // console.log('rename');
                        }}
                    >
                        <PencilLine className="w-4 h-4" />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="flex gap-2 m-0.5 p-2 rounded  text-sm cursor-pointer focus:ring-0 text-red-500 hover:text-red-500"
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteChat({
                                chatId: chat.chat_id,
                            }).then(() => {
                                // console.log(`chat ${chat.chat_id} deleted`);
                                onChatSelect(undefined);
                            })
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </DropdownMenuItem>

                </DropdownMenuContent>
            </DropdownMenu> */}
            {/* <div className="flex-none flex justify-center items-center">
                <Server className="h-4 w-4" />
            </div> */}

        </div>
    )
}


// controlled component
export const ChatsSideBar = ({
    activeChatId,
    isOpen,
    onClose,
    onChatSelect,
}: {
    activeChatId?: number;
    isOpen: boolean;
    onClose: () => void;
    onChatSelect: (chatId?: number) => void;
}) => {
    const {
        data: chats,
    } = useChats();

    return (
        <div className={
            cn(
                "transform top-0 left-0 w-[256px] bg-[rgb(27,27,27)] text-white fixed h-full overflow-y-auto overflow-x-hidden ease-in-out transition-all duration-300 z-30 px-[7px] py-1",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )
        }>
            <div className="flex flex-col h-full">
                <div className="flex flex-row justify-between items-center p-2.5 pr-1.5">
                    <p className="text-lg font-bold text-[rgb(240,240,240)]">Your Chats</p>
                    <div className="flex justify-end items-center">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild
                                    className=""
                                >
                                    <button
                                        className="h-9 w-9 flex justify-center items-center rounded-md bg-transparent  hover:bg-[rgb(48,48,48)]"
                                        onClick={() => {
                                            onChatSelect(undefined);
                                        }}
                                    >
                                        <SquarePen className="h-4 w-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent align="end" side="bottom" className="z-50">
                                    <p className="font-semibold text-sm text-[rgb(48,48,48)]">New Empty Chat</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
                {chats === undefined || chats.chats.length === 0 && (
                    <div className="flex-1 flex-grow h-full flex justify-center items-center">
                        <div className=" text-center text-[rgb(240,240,240)]">
                            You don't have any chats yet
                        </div>
                    </div>
                )}
                {chats && chats.chats.length > 0 && (
                    <div className="flex-col flex-1 transition-opacity duration-500  overflow-y-auto pt-1 space-y-0.5 ">

                        {chats?.chats.map((chat) => {
                            return (
                                <ChatSideBarItem
                                    key={`chat-sidebar-${chat.chat_id}`}
                                    chat={chat}
                                    onChatSelect={onChatSelect}
                                    active={activeChatId === chat.chat_id}
                                />
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
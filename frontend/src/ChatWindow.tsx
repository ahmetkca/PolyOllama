import React, { memo, useEffect, useState } from "react";
import { useWebSocket } from "./WebSocketContext";
// import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { v4 as uuidv4 } from "uuid";
import {
  OllamaStreamMessage,
  type ChatEntry,
  useChatEntriesStore,
  MessageWhenDone,
} from "./stores/use-chat-entries";
import { cn } from "./lib/utils";
import { Switch } from "./components/ui/switch";
import { Button } from "./components/ui/button";
import { Info, Loader2, Settings, Settings2, X } from "lucide-react";
import { useOllamaClientsStore } from "./stores/use-ollama-clients-store";
import { AspectRatio } from "./components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogTrigger, } from "./components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { AlertDialogPortal, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./components/ui/alert-dialog";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import { Label } from "./components/ui/label";
import { SelectModel } from "./SelectModelDropdown";
import { Toggle } from "./components/ui/toggle";
import { ImageWithPreview } from "./ImageWithPreview";
// import { ChatEntry } from "./ChatEntry";
import NewChatEntry, { ChatEntrySkeleton } from "./ChatEntry";
import { Slider } from "@/components/ui/slider"
import { Input } from "./components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Textarea } from "./components/ui/textarea";

const ChatWindowSettings = memo(({
  endpoint,
}: {
  endpoint: string;
}) => {
  const [open, setOpen] = useState(false);

  const {
    endpointsSelectedModel,
    setSelectedModelByEndpoint,
  } = useOllamaClientsStore((state) => state);

  const handleModelChange = (model: string) => {
    setSelectedModelByEndpoint(endpoint, model);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} defaultOpen={false}

    >
      <PopoverTrigger>
        <div className="flex flex-row justify-end items-center space-x-1.5">
          {endpointsSelectedModel.get(endpoint) && (
            <div className="flex flex-row justify-end items-center">
              <span className="font-light text-xs text-[#151515]">
                {endpointsSelectedModel.get(endpoint)}</span>
            </div>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  size={"icon"}
                  variant={"ghost"}
                  className="p-0 h-8 w-8"
                  onClick={() => {
                    setOpen(true);
                  }}
                >
                  {/* <Settings size={16} /> */}
                  <Settings2 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  Settings
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-[360px] p-1 h-auto">
        <Tabs defaultValue="settings" className=""

        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">
              Settings
            </TabsTrigger>
            <TabsTrigger value="system">
              System
            </TabsTrigger>
          </TabsList>
          <TabsContent value="settings">
            <div className="flex flex-col gap-2 p-2">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">
                    Model Settings
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Change the model settings for this Ollama Client
                  </p>
                </div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="width">
                      Model
                    </Label>
                    <SelectModel
                      endpoint={endpoint}
                      modelName={endpointsSelectedModel.get(endpoint)}
                      onModelChange={handleModelChange}
                    />

                  </div>
                  {/* <div className="grid grid-cols-3 items-center gap-4"> */}
                  <div className="grid grid-row-2 items-center gap-4">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="width">
                        Temperature
                      </Label>
                      <div></div>
                      <div>
                        <Input
                          id="temperature"
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          defaultValue="0.5"
                          // on hover, show a muted border box
                          // if focused, show a border box with a color
                          className="border-0 hover:border hover:border-[#949494] focus:border-[#0f0f0f] focus:ring-[#0f0f0f] focus:ring-2"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                      <div className="col-span-3">
                        <Slider defaultValue={[0.5]} min={0} max={1} step={0.01} />
                      </div>
                    </div>
                  </div>
                  {/* </div> */}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="system">
            <div className="h-full w-full">
              <div className="flex flex-col gap-1 py-1.5 px-1">
                <div className="space-y-2">
                  <span className="font-normal text-base leading-none">
                    System Prompt
                  </span>
                </div>
                <div className="flex-1">
                  <Textarea />
                </div>
              </div>
            </div>

          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
});




const KillChatWindowButton = ({
  endpoint,
  onKill,
}: {
  endpoint: string;
  onKill: (endpoint: string) => void;
}) => {

  const {
    endpoints,
    removeEndpoint,
  } = useOllamaClientsStore((state) => {
    return {
      endpoints: state.endpoints,
      removeEndpoint: state.removeEndpoint,
    };
  });

  const {
    removeChatEntriesByEndpoint
  } = useChatEntriesStore((state) => {
    return {
      removeChatEntriesByEndpoint: state.removeChatEntriesByEndpoint,
    };
  });

  const actionButtonRef = React.useRef<HTMLButtonElement>(null);

  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  const [killingOllamaClient, setKillingOllamaClient] = useState<boolean>(false);

  const killOllamaClient = async (endpoint: string) => {
    const response = await fetch(`http://localhost:3000/kill-ollama-client`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint }),
    });
    const data = await response.json();
    return data;
  };

  useEffect(() => {
    if (actionButtonRef.current && alertDialogOpen) {
      actionButtonRef.current.focus();
    }
  }, [alertDialogOpen]);

  const handleKeyDown = (event: KeyboardEvent) => {
    console.log("event", event);
    // Command + Alt/Option + k
    if (event.code === "KeyK" && event.metaKey && event.altKey) {
      const lastEndpoint = endpoints[endpoints.length - 1];
      if (lastEndpoint === endpoint) {
        setKillingOllamaClient(true);
      }
      killOllamaClient(lastEndpoint).then((killedEndpoint) => {
        console.log(`Killed Ollama Client: ${killedEndpoint}`);
        removeEndpoint(lastEndpoint);
        removeChatEntriesByEndpoint(lastEndpoint);
      }).catch((e) => {
        console.error("Error adding Ollama Client", e);
      }).finally(() => {
        if (lastEndpoint === endpoint) {
          setKillingOllamaClient(false);
        }
      });
      console.log("Command + Alt/Option + a pressed")
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen} defaultOpen={false}>
      <AlertDialogTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Button
                size="icon"
                variant={"ghost"}
                className="p-0 h-8 w-8"
                onClick={() => {
                  setAlertDialogOpen(true);
                }}
              >
                {killingOllamaClient ? <Loader2 className="animate-spin" size={16} /> : <X size={16} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                Kill Ollama Client
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the Ollama Client running on port
            <span className="font-semibold text-[#0f0f0f] ml-1 mr-1">
              {(new URL(endpoint)).port}
            </span>.
            Every chat history related to this Ollama Client will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setAlertDialogOpen(false);
          }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            ref={actionButtonRef}
            onClick={() => {
              setKillingOllamaClient(true);
              killOllamaClient(endpoint).then(() => {
                onKill(endpoint);
              }).catch((e) => {
                console.error("Error killing Ollama Client", e);
                toast.error(`Error killing Ollama Client: ${e}`);
              }).finally(() => {
                setKillingOllamaClient(false);
                setAlertDialogOpen(false);
              });
            }}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

  );
}



const OldChatEntry = ({ id, message, model, endpoint }: ChatEntry) => {
  // console.log(`ChatEntry; ${id}`)
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
            <div className="font-semibold select-none">{model}</div>
            <div className="relative flex w-full flex-col lg:w-[calc(100%-5px)] agent-turn">
              <div className="flex flex-col flex-1 flex-grow gap-1 md:gap-3">
                <div className="flex flex-grow flex-col max-w-full">
                  <div className="min-h-[20px] text-message flex flex-col items-start gap-3 whitespace-pre-wwrap breakk-words [.text-message+&]:mt-5 overflow-x-auto">
                    {message.images && message.images.length > 0 &&
                      message.images.map((image, i) => (
                        <ImageWithPreview
                          key={`${image.name}-${i}-${image.lastModified}-${image.size}`}
                          image={image} />

                      ))}
                    <div className="markdown prose w-full breakk-words dark:prose-invert light">
                      <p className="text-xs font-light">{endpoint}</p>
                      <p className="text-xs font-light">{id}</p>
                      <p className="text-[#0f0f0f] w-full whitespace-pre-wrap break-words paragraph">
                        {message.content}
                      </p>
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
};

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

const InfoDisplay =
  React.forwardRef<HTMLDivElement, InfoDisplayProps>(
    ({
      total_duration,
      load_duration,
      prompt_eval_count,
      prompt_eval_duration,
      prompt_eval_rate,
      eval_count,
      eval_duration,
      eval_rate
    }, ref) => {
      return (
        <div
          ref={ref}
          className={cn(
            // "z-20 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-3 text-base  bg-opacity-95  text-black rounded-md shadow-lg backdrop-blur-md",
            // "bg-[#eeeeee] border-[#949494] border-2 border-opacity-10"

            // "z-20 absolute top-0 left-1/2 transform -translate-x-1/2 p-3 text-base bg-opacity-95 text-black rounded-md shadow-lg backdrop-blur-md",
            // "bg-[#eeeeee] border-[#949494] border-2 border-opacity-10"

            "z-10 absolute text-base bg-opacity-95 p-2 text-black rounded-md shadow-lg backdrop-blur-md bg-[#eeeeee] border-[#949494] border-2 border-opacity-10"
          )}>

          {/* <div className="text-lg">
            <span className="font-light">{endpoint}</span>
          </div> */}
          <div>
            <span className="font-semibold ">Total Duration:</span>{" "}
            {total_duration.toFixed(3)}s
          </div>
          <div>
            <span className="font-semibold ">Load Duration:</span>{" "}
            {load_duration.toFixed(3)}s
          </div>
          <div>
            <span className="font-semibold ">Prompt Eval Count:</span>{" "}
            {prompt_eval_count}
          </div>
          <div>
            <span className="font-semibold ">Prompt Eval Duration:</span>{" "}
            {prompt_eval_duration.toFixed(3)}s
          </div>
          <div>
            <span className="font-semibold ">Prompt Eval Rate:</span>{" "}
            {prompt_eval_rate.toFixed(3)} tokens/s
          </div>
          <div>
            <span className="font-semibold ">Eval Count:</span>{" "}
            {eval_count}
          </div>
          <div>
            <span className="font-semibold ">Eval Duration:</span>{" "}
            {eval_duration.toFixed(3)}s
          </div>
          <div>
            <span className="font-semibold ">Eval Rate:</span>{" "}
            {eval_rate.toFixed(3)} tokens/s
          </div>
        </div>
      )
    }
  )



export const ChatWindow = ({
  endpoint,
  tailwindcssHeightClassName,
}: {
  endpoint: string;
  tailwindcssHeightClassName?: string;
}) => {


  const [showSpeed, setShowSpeed] = useState<{
    chatEntryId?: string;
    show: boolean;
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    prompt_eval_duration: number;
    prompt_eval_rate: number;
    eval_count: number;
    eval_duration: number;
    eval_rate: number;
  }>({
    chatEntryId: undefined,
    show: false,
    total_duration: 0,
    load_duration: 0,
    prompt_eval_count: 0,
    prompt_eval_duration: 0,
    prompt_eval_rate: 0,
    eval_count: 0,
    eval_duration: 0,
    eval_rate: 0,
  });

  const {
    endpoints,
    setEndpoints,
  } = useOllamaClientsStore((state) => state);

  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  const infoContainerRef = React.useRef<HTMLDivElement>(null);

  const [showInfo, setShowInfo] = useState(false);

  // const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);
  const {
    allChatEntries,
    addChatEntry,
    addContentToChatEntryById,
    doesChatEntryExist,
    getChatEntriesIndexByEndpoint,
    removeChatEntriesByEndpoint,
  } = useChatEntriesStore((state) => state);

  // const [showWaitingForOllamaClient, setShowWaitingForOllamaClient] = useState<boolean>(false);

  // check if the last chat entry in the chat entries for this endpoint is from user
  const lastChatEntry = allChatEntries.at(getChatEntriesIndexByEndpoint(endpoint))?.slice(-1)[0];
  const lastChatEntryRole = lastChatEntry?.message.role;


  useEffect(() => {
    const parent = chatContainerRef.current;
    const child = infoContainerRef.current;
    if (showSpeed.show && showInfo && parent && child) {

      const parentRect = parent.getBoundingClientRect();
      const childRect = child.getBoundingClientRect();

      // Calculate the centered position based on the scroll offset
      const top = (parent.scrollTop + (parentRect.height - childRect.height) / 2) + 'px';
      const left = (parent.scrollLeft + (parentRect.width - childRect.width) / 2) + 'px';

      // Apply the centered position to the child
      child.style.top = top;
      child.style.left = left;
    }
  }, [showSpeed.show, showInfo]);


  useEffect(() => {
    const parentx = chatContainerRef.current;
    const childx = infoContainerRef.current;

    console.log(`parent: ${parentx}`);
    console.log(`child: ${childx}`);

    const updateChildPosition = () => {
      const parent = chatContainerRef.current;
      const child = infoContainerRef.current;
      if (!parent || !child) {
        console.log('Parent or child not found');
        return;
      }

      const parentRect = parent.getBoundingClientRect();
      const childRect = child.getBoundingClientRect();

      // Calculate the centered position based on the scroll offset
      const top = (parent.scrollTop + (parentRect.height - childRect.height) / 2) + 'px';
      const left = (parent.scrollLeft + (parentRect.width - childRect.width) / 2) + 'px';

      // Apply the centered position to the child
      child.style.top = top;
      child.style.left = left;
    };

    // Update the child position on scroll
    parentx?.addEventListener('scroll', updateChildPosition);
    updateChildPosition(); // Initial positioning

    return () => {
      parentx?.removeEventListener('scroll', updateChildPosition);
    };
  }, [chatContainerRef, infoContainerRef, showInfo]);

  const { registerHandler, unregisterHandler } = useWebSocket();

  const handleIncomingMessage = (message: OllamaStreamMessage) => {
    if (message.data.message.done) {
      const lastMessage: MessageWhenDone = message.data
        .message as MessageWhenDone;

      // lastMessage.total_duration is in nanoseconds
      const totalDurationInSec = lastMessage.total_duration / 1e9;
      const loadDurationInSec = lastMessage.load_duration / 1e9;
      const promptEvalDurationInSec = lastMessage.prompt_eval_duration / 1e9;
      const evalDurationInSec = lastMessage.eval_duration / 1e9;
      setShowSpeed((prev) => ({
        ...prev,
        show: true,
        total_duration: totalDurationInSec,
        load_duration: loadDurationInSec,
        prompt_eval_count: lastMessage.prompt_eval_count,
        prompt_eval_duration: promptEvalDurationInSec,
        prompt_eval_rate:
          lastMessage.prompt_eval_count / promptEvalDurationInSec,
        eval_count: lastMessage.eval_count,
        eval_duration: evalDurationInSec,
        eval_rate: lastMessage.eval_count / evalDurationInSec,
        chatEntryId: message.data.messageChunkId,
      }));
    }
  };

  const handleMessage = (message: any) => {
    const incoming: OllamaStreamMessage = JSON.parse(JSON.stringify(message));
    console.log(incoming);

    const { messageChunkId } = incoming.data;
    console.log(`messageChunkId: ${messageChunkId}`);
    // const chatEntry = chatEntries.find((entry) => entry.id === messageChunkId)
    if (doesChatEntryExist(endpoint, messageChunkId)) {
      console.log(`This message chunk already exists: ${messageChunkId}`);
      addContentToChatEntryById(
        endpoint,
        messageChunkId,
        incoming.data.message.message.content,
      );
      if (chatContainerRef.current) {
        const { scrollHeight, clientHeight } = chatContainerRef.current;
        chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
      }

      if (incoming.data.message.done) {
        handleIncomingMessage(incoming);
      }

      return;
    }

    console.log(`This message chunk does not exist: ${messageChunkId}`);
    // create chat entry
    const newChatEntry: ChatEntry = {
      id: messageChunkId,
      message: incoming.data.message.message,
      model: incoming.data.message.model,
      endpoint,
    };
    // setChatEntries((prev) => [...prev, newChatEntry]);
    addChatEntry(endpoint, newChatEntry);
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }

    if (!showSpeed.show && incoming.data.message.done) {
      handleIncomingMessage(incoming);
    }
  };

  useEffect(() => {
    registerHandler(endpoint, handleMessage);
    return () => {
      unregisterHandler(endpoint);
      // clearChatEntries(endpoint);
    };
  }, [endpoint, registerHandler, unregisterHandler]);

  return (
    // cool modern slick minimalistic gradient glowing background and appropriate border purple

    <div
      ref={chatContainerRef}
      // full viewport height minus the header and footer
      // h-[calc(100vh-2rem)]
      className={cn(
        "w-full h-full  relative overflow-auto  bg-gradient-to-r from-[#f0f0f0] to-[#fCfCfC] ",
        "h-[calc(50vh-2.5rem)] rounded-xl border border-[#F1F1F1] border-opacity-30",
        tailwindcssHeightClassName
      )}
    >
      <div className="sticky top-0 left-0 w-full bg-[#f0f0f0] items-center h-10 mb-1.5 z-20 pl-3 pr-0 pb-1.5">
        <div className="flex flex-row justify-start items-center h-10 text-lg font-semibold text-[#0f0f0f] px-1 py-0.5">
          <div className="flex flex-1 flex-grow">
            <div className="flex flex-row justify-start items-center">
              <span className="font-extralight text-sm p-0.5">
                Running on port <span className="font-semibold text-[#0f0f0f] px-0.5">
                  {new URL(endpoint).port}
                </span>
              </span>
            </div>
          </div>
          <div className="flex flex-row justify-end items-center gap-2">

            <ChatWindowSettings endpoint={endpoint} />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex-none pt-1">
                    {/* <Toggle

                      aria-label="Show Speed"
                      size={'sm'}
                      variant={'outline'}
                      onClick={() => setShowInfo((prev) => !prev)}
                    >
                      <Info size={16} />
                    </Toggle> */}
                    <Switch
                      checked={showInfo}
                      onCheckedChange={(checked) => setShowInfo(checked)}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    {showInfo ? "Hide" : "Show"} Speed
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* kill button to kill the ollama server and close the chat window and remove the endpoint from the list */}

            <KillChatWindowButton
              endpoint={endpoint}
              onKill={(endpoint) => {
                console.log(`Killing Ollama Client: ${endpoint}`);
                setEndpoints(endpoints.filter((e) => e !== endpoint));
                removeChatEntriesByEndpoint(endpoint);
              }}
            />

          </div>
        </div>
      </div>
      <div className="flex flex-col pb-9 text-sm">
        {allChatEntries.at(getChatEntriesIndexByEndpoint(endpoint)) ?
          allChatEntries.at(getChatEntriesIndexByEndpoint(endpoint))?.map(
            (entry) => (
              // <ChatEntry
              //   key={entry.id}
              //   id={entry.id}
              //   message={entry.message}
              //   model={entry.model}
              //   endpoint={entry.endpoint}
              // />
              <NewChatEntry
                key={`chat-entry-${entry.id}`}
                id={entry.id}
                endpoint={entry.endpoint}
              />
            ),
          ) : <p>No chat entries</p>}
        {lastChatEntryRole === 'user' && (
          <ChatEntrySkeleton />)}
      </div>

      {showInfo &&
        showSpeed.show && (
          <InfoDisplay
            ref={infoContainerRef}
            total_duration={showSpeed.total_duration}
            load_duration={showSpeed.load_duration}
            prompt_eval_count={showSpeed.prompt_eval_count}
            prompt_eval_duration={showSpeed.prompt_eval_duration}
            prompt_eval_rate={showSpeed.prompt_eval_rate}
            eval_count={showSpeed.eval_count}
            eval_duration={showSpeed.eval_duration}
            eval_rate={showSpeed.eval_rate}
          />
        )}
    </div>
  );
};

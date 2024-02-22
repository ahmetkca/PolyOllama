import React, { memo, useCallback, useEffect, useRef, useState } from "react";
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
import { useConversation, useConversationMessages } from "./hooks/use-conversations";


// controlled component
const ModelSettingInput = ({
  label,
  minValue,
  maxValue,
  step,
  defaultValue,
  onChange,
}: {
  label: string;
  minValue: number;
  maxValue: number;
  step: number;
  defaultValue: number;
  onChange: (value: number) => void;
}) => {

  // if slider changes, then input should also change
  // if inut changes, then slider should also change

  const [value, setValue] = useState(defaultValue);

  const handleSliderChange = (value: number) => {
    setValue(value);
    onChange(value);
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // console.log(event);
    const value = parseFloat(event.target.value);
    setValue(value);
    onChange(value);
  }

  return (
    <>
      <div className="grid grid-cols-3 items-center gap-4">
        <Label htmlFor="width">
          {label}
        </Label>
        <div></div>
        <div>
          <Input
            id="temperature"
            type="number"
            min={minValue}
            max={maxValue}
            step={step}
            value={value}
            // defaultValue={defaultValue}
            // on hover, show a muted border box
            // if focused, show a border box with a color
            className="border border-opacity-0 hover:border-opacity-100 hover:border-[#949494]  focus:ring-[#0f0f0f] focus:ring-2"
            onChange={handleInputChange}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 items-center gap-4">
        <div className="col-span-3">
          <Slider
            value={[value]}
            // defaultValue={[defaultValue]}
            min={minValue}
            max={maxValue}
            step={step}
            onValueChange={(sliderVal) => handleSliderChange(sliderVal[0])}
          />
        </div>
      </div>
    </>
  )
}


const ChatWindowSettings = ({
  endpoint,
  conversation,
}: {
  endpoint: string;
  conversation?: {
    conversation_id: number;
    model: string;
    chat_id: number;
    endpoint_id: number;
    endpoint: string;
  };
}) => {
  // if conversation is undefined, it means that the endpoint is not yet associated with a conversation, therefore, model selection should be enabled.
  const isModelSelectionEnabled = useRef<boolean>(
    conversation === undefined ? true : false
  );

  // console.log(`ChatWindowSettings for endpoint: ${endpoint}`);
  // console.log("conversation", conversation);
  // console.log("isModelSelectionEnabled", isModelSelectionEnabled.current);


  const [open, setOpen] = useState(false);
  const [modelSettings, setModelSettings] = useState<{
    temperature: number | null;
    top_k: number | null;
    top_p: number | null;
    num_ctx: number | null;
  }>({
    temperature: null,
    top_k: null,
    top_p: null,
    num_ctx: null,
  });

  const {
    endpointsSelectedModel,
    setSelectedModelByEndpoint,
  } = useOllamaClientsStore((state) => state);


  const handleModelChange = (model: string) => {
    setSelectedModelByEndpoint(endpoint, model);
  };

  useEffect(() => {

    if (conversation) {
      // console.log("Setting selected model by endpoint", endpoint, conversation.model);
      isModelSelectionEnabled.current = false;
      setSelectedModelByEndpoint(endpoint, conversation.model);

    } else {
      // console.log(`The conversation is not yet defined for endpoint: ${endpoint}`);
      // console.log("Currently the models for the endpoints are: ", endpointsSelectedModel);
    }

    // console.log(`CONVERSATION CHANGED, endpoint: ${endpoint}, conversation: `, conversation, 'isModelSelectionEnabled', isModelSelectionEnabled.current, 'endpointsSelectedModel', endpointsSelectedModel);
  }, [conversation]);

  return (
    // <div className="flex flex-row text-xs font-light space-x-0.5">
    //   <span className="p-0.5 border">{endpoint}</span>
    //   <span className="p-0.5 border">{conversation ? conversation.model : "No way"}</span>
    //   <span className="p-0.5 border">{isModelSelectionEnabled.current ? "true" : "false"}</span>
    //   <span className="p-0.5 border">{endpointsSelectedModel.get(endpoint)}</span>
    // </div>
    <Popover open={open} onOpenChange={setOpen} defaultOpen={false}

    >
      <PopoverTrigger>
        <div className="flex flex-row justify-end items-center space-x-1.5">
          {/* {endpointsSelectedModel.get(endpoint) && (
            <div className="flex flex-row justify-end items-center">
              <span className="font-light text-xs text-[#151515]">
                {endpointsSelectedModel.get(endpoint)}</span>
            </div>
          )} */}

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
        // align="center"
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
            <div className="flex flex-col gap-2 p-2 pr-1">
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
                  <div className="grid grid-cols-3 items-center gap-0.5 mb-1">
                    <Label htmlFor="width">
                      Model
                    </Label>
                    <SelectModel
                      disabled={!isModelSelectionEnabled.current}
                      endpoint={endpoint}
                      modelName={endpointsSelectedModel.get(endpoint)}
                      onModelChange={handleModelChange}
                    />

                  </div>
                  {/* <div className="grid grid-cols-3 items-center gap-4"> */}
                  <div className="grid grid-row-2 items-center gap-4">
                    <ModelSettingInput
                      label="Temperature"
                      minValue={0}
                      maxValue={1}
                      step={0.01}
                      defaultValue={0.5}
                      onChange={(value) => {
                        // console.log("Temperature changed to: ", value);
                        setModelSettings((prev) => ({ ...prev, temperature: value }));
                      }}

                    />
                    <ModelSettingInput
                      label="Top-k"
                      minValue={0}
                      maxValue={100}
                      step={1}
                      defaultValue={50}
                      onChange={(value) => {
                        // console.log("Top-k changed to: ", value);
                        setModelSettings((prev) => ({ ...prev, top_k: value }));
                      }}
                    />
                    <ModelSettingInput
                      label="Top-p"
                      minValue={0}
                      maxValue={1}
                      step={0.01}
                      defaultValue={0.9}
                      onChange={(value) => {
                        // console.log("Top-p changed to: ", value);
                        setModelSettings((prev) => ({ ...prev, top_p: value }));
                      }}
                    />
                    <ModelSettingInput
                      label="Num ctx"
                      minValue={0}
                      maxValue={4096}
                      step={1}
                      defaultValue={2048}
                      onChange={(value) => {
                        // console.log("Num ctx changed to: ", value);
                        setModelSettings((prev) => ({ ...prev, num_ctx: value }));
                      }}
                    />
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
}




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
    // console.log("event", event);
    // Command + Alt/Option + k
    if (event.code === "KeyK" && event.metaKey && event.altKey) {
      const lastEndpoint = endpoints[endpoints.length - 1];
      if (lastEndpoint === endpoint) {
        setKillingOllamaClient(true);
      }
      killOllamaClient(lastEndpoint).then((killedEndpoint) => {
        // console.log(`Killed Ollama Client: ${killedEndpoint}`);
        removeEndpoint(lastEndpoint);
        removeChatEntriesByEndpoint(lastEndpoint);
      }).catch((e) => {
        console.error("Error adding Ollama Client", e);
      }).finally(() => {
        if (lastEndpoint === endpoint) {
          setKillingOllamaClient(false);
        }
      });
      // console.log("Command + Alt/Option + a pressed")
    }
  };

  // Currently, doesn't make sense to add this.
  // useEffect(() => {
  //   document.addEventListener("keydown", handleKeyDown);
  //   return () => {
  //     document.removeEventListener("keydown", handleKeyDown);
  //   };
  // }, [handleKeyDown]);

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
                Kill Ollama Server
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
            This action cannot be undone. This will permanently delete the Ollama Server running on port
            <span className="font-semibold text-[#0f0f0f] ml-1 mr-1">
              {(new URL(endpoint)).port}
            </span>.
            The conversation that is associated with this Ollama Server will also be deleted.
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



export const ChatWindow = ({
  chatId,
  conversationId,
  endpoint,
  tailwindcssHeightClassName,
  onIncomingMessageProgress,
}: {
  chatId?: number;
  conversationId?: number;
  endpoint: string;
  tailwindcssHeightClassName?: string;
  onIncomingMessageProgress: (
    endpoint: string,
    action: "register" | "unregister" | "change" | "registerIfNotExists",
    status: "idle" | "progress"
  ) => void;
}) => {
  const {
    data: conversation,
  } = useConversation({ chatId: chatId, conversationId: conversationId, endpoint: endpoint });
  // console.log("CONVERSATION: ", conversation);


  // CULPRIT COME HERE
  // MAYBE NEEDED
  useEffect(() => {
    onIncomingMessageProgress(endpoint, "registerIfNotExists", "idle");
    return () => {
      onIncomingMessageProgress(endpoint, "unregister", "idle");
    };
  }, []);

  const {
    // endpoints,
    // setEndpoints,
    removeEndpoint,
    endpointsSelectedModel,
  } = useOllamaClientsStore((state) => state);

  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  const {
    allChatEntries,
    addChatEntry,
    addContentToChatEntryById,
    doesChatEntryExist,
    getChatEntriesIndexByEndpoint,
    removeChatEntriesByEndpoint,
    addChatEntries,
    updateChatEntryMessageMetricsByMsgId
  } = useChatEntriesStore((state) => ({
    allChatEntries: state.allChatEntries,
    addChatEntry: state.addChatEntry,
    addContentToChatEntryById: state.addContentToChatEntryById,
    doesChatEntryExist: state.doesChatEntryExist,
    getChatEntriesIndexByEndpoint: state.getChatEntriesIndexByEndpoint,
    removeChatEntriesByEndpoint: state.removeChatEntriesByEndpoint,
    addChatEntries: state.addChatEntries,
    updateChatEntryMessageMetricsByMsgId: state.updateChatEntryMessageMetricsByMsgId,

  }));

  // check if the last chat entry in the chat entries for this endpoint is from user
  const lastChatEntry = allChatEntries.at(getChatEntriesIndexByEndpoint(endpoint))?.slice(-1)[0];
  const lastChatEntryRole = lastChatEntry?.message.role;
  const getChatEntriesByEndpoint = useCallback(() => {
    return allChatEntries.at(getChatEntriesIndexByEndpoint(endpoint));
  }, [allChatEntries, endpoint]);

  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [getChatEntriesByEndpoint]);

  ///////////////////
  const {
    data: messages,
  } = useConversationMessages(conversationId);

  useEffect(() => {

    // console.log(`Adding chat entries for endpoint: ${endpoint}`);
    if (messages) {
      removeChatEntriesByEndpoint(endpoint);
      addChatEntries(endpoint, messages.messages.map(
        (message) => ({
          id: message.message_id,
          chatId: message.chat_id,
          conversationId: message.conversation_id,
          endpoint: message.endpoint,
          message: {
            content: message.content,
            role: message.role,
            images: message.image ? [new File([new Blob([message.image], { type: 'application/octet-stream' })], message.message_id, { type: 'application/octet-stream' })] : [],
            total_duration: message.total_duration === null ? undefined : message.total_duration,
            load_duration: message.load_duration === null ? undefined : message.load_duration,
            prompt_eval_count: message.prompt_eval_count === null ? undefined : message.prompt_eval_count,
            prompt_eval_duration: message.prompt_eval_duration === null ? undefined : message.prompt_eval_duration,
            prompt_eval_rate: message.prompt_eval_rate === null ? undefined : message.prompt_eval_rate,
            eval_count: message.eval_count === null ? undefined : message.eval_count,
            eval_duration: message.eval_duration === null ? undefined : message.eval_duration,
            eval_rate: message.eval_rate === null ? undefined : message.eval_rate,
          },
          model: message.model,
        })
      ));
      if (messages.messages.length === 1 && messages.messages[0].role === "user") {
        onIncomingMessageProgress(endpoint, "change", "progress");
      }
    }

    return () => {
      // console.log(`Removing chat entries for endpoint: ${endpoint}`);
      removeChatEntriesByEndpoint(endpoint);
    }
  }, [messages, chatId, conversationId, endpoint]);
  /////////////////////

  const { registerHandler, unregisterHandler } = useWebSocket();

  const handleIncomingLastMessage = (message: OllamaStreamMessage) => {
    if (message.data.message.done) {
      // console.log("Incoming message is done");
      onIncomingMessageProgress(endpoint, "change", "idle");

      if (message.data.messageMetrics !== null) {
        updateChatEntryMessageMetricsByMsgId(endpoint,
          message.data.messageChunkId, {
          total_duration: message.data.messageMetrics.total_duration,
          load_duration: message.data.messageMetrics.load_duration,
          prompt_eval_count: message.data.messageMetrics.prompt_eval_count,
          prompt_eval_duration: message.data.messageMetrics.prompt_eval_duration,
          prompt_eval_rate: message.data.messageMetrics.prompt_eval_rate,
          eval_count: message.data.messageMetrics.eval_count,
          eval_duration: message.data.messageMetrics.eval_duration,
          eval_rate: message.data.messageMetrics.eval_rate,
        })
      }

    }
  };

  const handleMessage = (message: any) => {
    if (!chatId || !conversationId) {
      // console.log(`ChatId: ${chatId} or ConversationId: ${conversationId} is not set`);
      return;
    }


    const incoming: OllamaStreamMessage = JSON.parse(JSON.stringify(message));
    // console.log(incoming);

    const { messageChunkId } = incoming.data;
    // console.log(`messageChunkId: ${messageChunkId}`);
    // const chatEntry = chatEntries.find((entry) => entry.id === messageChunkId)
    if (doesChatEntryExist(endpoint, messageChunkId)) {
      // console.log(`This message chunk already exists: ${messageChunkId}`);
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
        handleIncomingLastMessage(incoming);
      }

      return;
    }

    // console.log(`This message chunk does not exist: ${messageChunkId}`);
    // create chat entry
    const newChatEntry: ChatEntry = {
      id: messageChunkId,
      message: incoming.data.message.message,
      model: incoming.data.message.model,
      endpoint,
      chatId,
      conversationId,
    };
    // setChatEntries((prev) => [...prev, newChatEntry]);
    addChatEntry(endpoint, newChatEntry);
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }

    if (incoming.data.message.done) {
      handleIncomingLastMessage(incoming);
    }
  };

  useEffect(() => {
    // console.log(`Registering handler for ChatId: ${chatId}, ConversationId: ${conversationId}, Endpoint: ${endpoint}`);
    registerHandler(endpoint, handleMessage);
    return () => {
      unregisterHandler(endpoint);
      // clearChatEntries(endpoint);
    };
  }, [endpoint, registerHandler, unregisterHandler, chatId, conversationId]);

  return (

    <div
      ref={chatContainerRef}
      // full viewport height minus the header and footer
      // h-[calc(100vh-2rem)]
      className={cn(
        "w-full h-full  relative overflow-auto  bg-gradient-to-r from-[rgb(247,247,247)] to-[rgb(253,253,253)] ",
        "h-[calc(50vh-2.5rem)] rounded-xl border border-[rgb(217,217,217)] border-opacity-30",
        tailwindcssHeightClassName
      )}
    >
      <div className="sticky top-0 left-0 w-full bg-[rgb(247,247,247)] items-center h-10 mb-1.5 z-20 pl-3 pr-0 pb-1.5">
        <div className="flex flex-row justify-start items-center h-10 text-lg font-semibold text-[#0f0f0f] px-1 py-0.5">
          <div className="flex flex-1 flex-grow">
            <div className="flex flex-row justify-start items-center">
              {/* <span className="font-extralight text-sm p-0.5">
                Running on port <span className="font-semibold text-[#0f0f0f] px-0.5">
                  {new URL(endpoint).port}
                </span>
              </span> */}
              {endpointsSelectedModel.get(endpoint) ? (<span>
                <span className="font-semibold text-[#0f0f0f] px-0.5">
                  {endpointsSelectedModel.get(endpoint)}
                </span>
              </span>) : <span className="font-medium">No model selected yet</span>}
            </div>
          </div>
          <div className="flex flex-row justify-end items-center gap-2">

            <ChatWindowSettings endpoint={endpoint} conversation={conversation?.conversation} />

            {/* kill button to kill the ollama server and close the chat window and remove the endpoint from the list */}

            <KillChatWindowButton
              endpoint={endpoint}
              onKill={(endpoint) => {
                // console.log(`Killing Ollama Client: ${endpoint}`);
                removeEndpoint(endpoint);
                removeChatEntriesByEndpoint(endpoint);
              }}
            />

          </div>
        </div>
      </div>
      <div className="flex flex-col pb-9 text-sm">
        {/* {allChatEntries.at(getChatEntriesIndexByEndpoint(endpoint)) ?
          allChatEntries.at(getChatEntriesIndexByEndpoint(endpoint))?.map( */}
        {getChatEntriesByEndpoint() ?
          getChatEntriesByEndpoint()?.map(
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

      {/* {showInfo &&
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
        )} */}
    </div>
  );
};

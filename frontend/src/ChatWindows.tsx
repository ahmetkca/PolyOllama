import { ChatWindow } from "./ChatWindow";

import polyllama from "./assets/polyllama_1.svg";

import { useOllamaClientsStore } from "./stores/use-ollama-clients-store";
import { ChatSend } from "./ChatSend";
import { useCallback, useEffect, useReducer, useState } from "react";
import { useWebSocket } from "./WebSocketContext";

import { Button, ButtonProps } from "./components/ui/button";
import { AlertCircle, Bot, Loader2, MessageSquare, PanelLeftOpen, PanelRightOpen, Plus, Zap } from "lucide-react";

import { useChatEntriesStore } from "./stores/use-chat-entries";

import { v4 as uuidv4 } from "uuid";
import { cn } from "./lib/utils";
import { useConversations } from "./hooks/use-conversations";
import { useChat, useChatAssignEndpointsToConversations, useChats } from "./hooks/use-chats";
import TypeWriter from "./TypeWriter";
import { ModeToggle } from "./components/mode-toggle";
import { AspectRatio } from "./components/ui/aspect-ratio";
import { toast } from "sonner";
import { ChatTitle } from "./ChatTitle";
import WaveLoader from "./WaveLoader";


const AddOllamaClientBUtton = ({
  onAddOllamaClient,
  disabled = false,
  size
}: {
  disabled?: boolean;
  onAddOllamaClient?: () => void;
} & ButtonProps) => {

  const {
    // endpoints,
    // setEndpoints,
    addEndpoints,
  } = useOllamaClientsStore((state) => {
    return {
      // endpoints: state.endpoints,
      // setEndpoints: state.setEndpoints,
      addEndpoints: state.addEndpoints
    }
  });

  const createChatEntriesByEndpoint = useChatEntriesStore((state) => state.createChatEntriesByEndpoint);

  const [addingOllamaClient, setAddingOllamaClient] = useState<boolean>(false);

  const addOllamaServer = () => {
    setAddingOllamaClient(true);
    addOllamaClient().then((newEndpoint) => {
      console.log("newEndpoint", newEndpoint.endpoint);
      // setEndpoints([...endpoints, newEndpoint.endpoint]);
      addEndpoints([newEndpoint.endpoint]);
      createChatEntriesByEndpoint(newEndpoint.endpoint);
      onAddOllamaClient?.();
    }).catch((e) => {
      console.error("Error adding Ollama Client", e);
    }).finally(() => {
      setAddingOllamaClient(false);
    });
  }

  const handleKeyDown = (event: KeyboardEvent) => {

    console.log("event", event);
    // Command + Alt/Option + a
    if (event.code === "KeyA" && event.metaKey && event.altKey) {
      addOllamaServer();
      console.log("Command + Alt/Option + a pressed")
    }
  };

  useEffect(() => {
    if (disabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <Button
      size={size}
      variant="default"
      className=" prr-4.5 pll-6"
      onClick={() => {
        addOllamaServer();
      }}
      disabled={addingOllamaClient || disabled}
    >
      <span
        className="px- mr-1.5"
      >
        {/* {addingOllamaClient ? loadingText : "Add Ollama Client"} */}

        Add a new Conversation
      </span>
      {addingOllamaClient ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus className="h-5 w-5" />}
    </Button >
  )
}

const addOllamaClient = async () => {
  const response = await fetch("http://localhost:3000/new-ollama-client", {
    method: "POST",
  });
  const data = await response.json();
  return data;
}


const ChatOllamaServerWarning = ({
  numOfConversationsWithoutEndpoint,
  size = "default",
  waitingModelsToRespond = false
}: {
  size?: "default" | "lg" | "sm" | "md";
  numOfConversationsWithoutEndpoint: number;
  waitingModelsToRespond?: boolean;
}) => {
  if (waitingModelsToRespond) {
    return (
      <div className="flex flex-row justify-center items-end gap-1 mr-1">
        <div>
          <Bot size={32} className="animate-grow-shrink" />
        </div>
        {/* <div className="pb-0.5">
          <WaveLoader animationSpeed={100} dotCount={5} />
        </div> */}
      </div>
    )
  }


  return (
    <>
      {numOfConversationsWithoutEndpoint > 0 ? (
        <div className={
          cn("flex flex-row justify-start items-center space-x-0.5 border border-[#FFA726] rounded-md py-[1px] px-1 w-56",
            size === "lg" && "w-72 space-x-0",)
        }>
          <div className="flex-1">
            <AlertCircle color="#FFA726" className="" size={size === 'lg' ? 27 : undefined} />
          </div>
          <div className="py-0.5">
            <p className={
              cn("text-xs text-center font-light text-[#FFA726] break-words",
                size === "lg" && "text-sm")
            }>
              Add <span className={
                cn("font-semibold text-sm",
                  size === "lg" && "text-base")
              }>
                {numOfConversationsWithoutEndpoint}</span> more Conversation{numOfConversationsWithoutEndpoint > 0 ? "s" : ""} to enable this chat.
            </p>
          </div>
        </div>) :
        <div
          // minimalist, modern bluish ice frosty border color
          //rgb(113,143,249)
          className={
            cn("flex flex-row justify-center items-center space-x-0.5 border border-[rgb(113,143,255)] rounded-md p-0.5 px-1 h-11 w-[92px]")
          }>
          <div className="flex-shrink h-full  flex items-center justify-center">

            <Zap color="rgb(103,153,255)"
              // center but slightly closer to the top
              className="transform  ready-chat-icon "
              fill="rgb(113,163,255)" strokeWidth={1.5} size={21}
              fillRule="evenodd" />
            {/* <MessageSquare
              // center the icon
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-7 w-7"
              color="rgb(113,143,249)"
              strokeWidth={0.90}
            /> */}
          </div>
          <div className="flex-grow">
            <p className={
              cn("text-xs/3 text-center font-normal text-[rgb(113,143,249)] break-words")
            }>
              Ready to chat
            </p>
          </div>
        </div>}
    </>
  )
}


export interface ChatWindowsProps {
  chatId?: number;
  onNewChat: (
    msg: string,
    images: {
      converted: Uint8Array,
      file: File
    }[] | undefined,
    endpointsToChat: Map<string, boolean>,
    endpointsSelectedModel: Map<string, string>,
  ) => Promise<void>;
  onChatChange: (chatId: number) => void;
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
}


export const ChatWindows = ({
  chatId,
  onNewChat,
  isSidebarOpen,
  openSidebar,
  closeSidebar,
}: ChatWindowsProps) => {

  const {
    trigger: assignEndpointsToConversations,
  } = useChatAssignEndpointsToConversations();

  const {
    data: currentChat
  } = useChat(chatId);

  // the conversations might not have endpoint since endpoints are easy to add and remove and get removed when the server is removed.
  // {
  //     conversation_id: number;
  //     model: string;
  //     chat_id: number;
  //     endpoint_id: number | null;
  // } & {
  //     endpoint: string | null;
  // }
  const {
    data: conversations,
    mutate: mutateConversations
  } = useConversations(chatId);
  const numOfConversations = conversations?.conversations.length || 0;
  const numOfConversationsWithoutEndpoint = conversations?.conversations.filter((conv) => conv.endpoint === null).length || 0;
  const numOfConversationsWithEndpoint = numOfConversations - numOfConversationsWithoutEndpoint;


  const [chatWindowsIncomingMessageProgress, dispatchChatWindowsIncomingMessageProgress] =
    useReducer(
      (
        state: Map<string, "idle" | "progress">,
        action: {
          type: "register" | "unregister" | "change" | "registerIfNotExists"
          endpoint: string,
          status: "idle" | "progress"
        }
      ) => {
        const newState = new Map(state);
        switch (action.type) {
          case "register":
            newState.set(action.endpoint, "idle");
            return newState;
          case "unregister":
            newState.delete(action.endpoint);
            return newState;
          case "change":
            newState.set(action.endpoint, action.status!);
            return newState;
          case "registerIfNotExists":
            if (!newState.has(action.endpoint)) {
              newState.set(action.endpoint, "idle");
            }
            return newState;
          default:
            return state;
        }
      }, new Map<string, "idle" | "progress">());



  const areAllChatWindowsIdle = () => {
    return Array.from(chatWindowsIncomingMessageProgress.values()).every((status) => status === "idle");
  }

  const atLeastOneChatWindowIsProgress = () => {
    return Array.from(chatWindowsIncomingMessageProgress.values()).some((status) => status === "progress");
  }

  // Not working as expected. 
  // useEffect(() => {
  //   // Function to handle the beforeunload event
  //   const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  //     // If the chatbot is responding, disable refresh and close
  //     if (areAllChatWindowsIdle() === false) {
  //       toast.warning("Please wait for models to respond before refreshing or closing the page.");
  //       // Prevent the page from being closed or refreshed
  //       event.preventDefault();
  //       // Chrome requires returnValue to be set
  //       event.returnValue = '';
  //     }
  //   };

  //   // Add event listener for beforeunload
  //   window.addEventListener('beforeunload', handleBeforeUnload);

  //   // Cleanup function to remove the event listener
  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //   };
  // }, [areAllChatWindowsIdle]);


  const handleIncomingMessageProgress = (
    endpoint: string,
    action: "register" | "unregister" | "change" | "registerIfNotExists",
    status: "idle" | "progress"
  ) => {
    dispatchChatWindowsIncomingMessageProgress({ type: action, endpoint, status });
  }



  const addChatEntry = useChatEntriesStore((state) => state.addChatEntry);

  const { sendMessage } = useWebSocket();

  const {
    endpoints,
    endpointsSelectedModel,
    endpointsToChat
  } = useOllamaClientsStore((state) => {
    return {
      endpoints: state.endpoints,
      endpointsSelectedModel: state.endpointsSelectedModel,
      endpointsToChat: state.endpointsToChat
    }
  });

  useEffect(() => {
    if (chatId === undefined || conversations === undefined) return;

    // here we can try to assign available endpoints to conversations that don't have an endpoint.
    console.log(`There are ${numOfConversationsWithoutEndpoint} conversations without an endpoint.`);
    console.log(`Currently there are ${endpoints.length} endpoints.`);
    console.log(`Endpoints: ${endpoints}`);
    assignEndpointsToConversations({ chatId: chatId, endpoints: endpoints })
      .then((_) => {
        mutateConversations();
      }).catch((e) => {
        console.error("Error assigning endpoints to conversations", e);
        toast.error("Error assigning endpoints to conversations");
      });
  }, [chatId, conversations, endpoints]);


  const handleMessageSend = async (msg: string, images: {
    converted: Uint8Array,
    file: File
  }[] | undefined) => {
    if (!chatId) {
      onNewChat(
        msg,
        images,
        new Map(endpointsToChat),
        new Map(endpointsSelectedModel)
      );
      return;
    }
    endpointsToChat.forEach((isEnabled, endpoint) => {
      if (isEnabled) {
        dispatchChatWindowsIncomingMessageProgress({ type: "change", endpoint, status: "progress" });
      };
    });

    const imageFiles = images?.map((image) => {
      console.log(`image.file: ${image.file.name}`);
      return image.file
    });

    // here check if the endpoint is enabled for chat. If not, don't send the message to that endpoint
    for (const [endpoint, isEnabled] of endpointsToChat.entries()) {
      if (!isEnabled) continue;
      const convId = conversations?.conversations?.find((conv) => conv.endpoint === endpoint)?.conversation_id;
      addChatEntry(endpoint, {
        id: uuidv4(),
        message: {
          content: msg,
          role: "user",
          images: imageFiles,
        },
        model: "User",
        endpoint,
        chatId: chatId,
        conversationId: convId || -1,
      })
    }
    const imagesToSend = images?.map((image) => {
      return image.converted;
    });

    console.log(`Sending message: ${msg} with ${imagesToSend?.length} images`);


    // in the backend the server will have to know which endpoints to send the message to and which model to use
    // data.model will be used if there is no model for corresponding endpoint in endpointsSelectedModel.
    sendMessage({
      type: "chat-message",
      data: {
        // isFirstMessage is used to determine if this is first time the user is sending a message to the associated chat.
        isFirstMessage: false,

        // currently, the chatId is not used.
        // if there is no chatId, it means we have to create a new chat
        chatId: chatId,
        message: msg,
        images: imagesToSend,
        // Map is not serializable. Convert to array of objects
        endpointsToChat: Array.from(endpointsToChat.entries()).map(([endpoint, isEnabled]) => {
          return { endpoint, isEnabled }
        }),
        endpointsSelectedModel: Array.from(endpointsSelectedModel.entries()).map(([endpoint, model]) => {
          return { endpoint, model }
        }),
      },
    });
  };


  const getGridColsClassName = (length: number) => {
    console.log(`oo- GRID: length of the ${length}`);
    if (length === 1) return "grid-cols-1";
    if (length >= 2 && length <= 4) return "grid-cols-2";
    if (length >= 5) return "grid-cols-6";
  };

  const getColSpanClassName = (length: number, index: number) => {
    console.log(`oo- COLSPAN: length of the ${length}, index: ${index}`);
    if (length === 1) return "col-span-1";

    // if there are 2 endpoints, first two endpoints should span 1 column each
    if (length === 2) return "col-span-1";

    // if there are 3 endpoints, first two endpoints should span 1 column each
    if (length === 3 && index < 2) return "col-span-1";
    // if there are 3 endpoints, the last endpoint should span 2 columns
    if (length === 3 && index === length - 1) return "col-span-2";

    // if there are 4 endpoints, all endpoints should span 1 column each
    if (length === 4) return "col-span-1";


    const MAX_CHAT_WINDOWS_PER_ROW_AFTER_FOUR_CHAT_WINDOWS = 3
    const modulo = length % MAX_CHAT_WINDOWS_PER_ROW_AFTER_FOUR_CHAT_WINDOWS;

    const isLastRow = index >= length - modulo;
    if (!isLastRow) return "col-span-2";

    console.log(`length: ${length}, index: ${index}, modulo: ${modulo}`)

    // modulo is used to determine the number of chat windows in the last row
    // modulo can be 0 which means there are 3 chat windows in the last row
    if (modulo === 0) return "col-span-2";

    // modulo can be 1 which means there is 1 chat window in the last row
    if (modulo === 1) return "col-span-6";

    // modulo can be 2 which means there are 2 chat windows in the last row
    if (modulo === 2) return "col-span-3";
  };


  return (
    <>
      <div className="w-hull">
        <div className=" w-full h-screen px-1 sm:px-2 md:px-4 ">
          {endpoints.length === 0 || (conversations && conversations?.conversations.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-full scale-100 pb-16 mx-auto max-w-md">
              <div className="flex flex-col items-center justify-center mb-5 space-y-2">
                <AspectRatio ratio={16 / 9}>
                  <img src={polyllama} alt="Ollama" className="" />
                </AspectRatio>

                <div className="flex flex-row justify-center">
                  <span className="boujee-text font-semibold"
                    style={{
                      fontSize: "clamp(2rem, 10vw, 4.2rem)",
                    }}
                  >
                    Poly
                  </span>

                  <div className="flex flex-col pt-3.5">
                    <p className="text-sm/9 pl-1 font-normal">
                      powered by
                    </p>
                    <p className="text-5xl/3 font-semibold text-[#0f0f0f] ">
                      Ollama
                    </p>
                  </div>
                </div>

                {/* <p className="text-5xl font-semibold text-[#0f0f0f] text-center px-8">

                  <span className=" boujee-text"
                    style={{
                      fontSize: "clamp(2rem, 10vw, 4.2rem)",
                    }}
                  >
                    Poly
                  </span>

                  Ollama
                </p> */}

                {/* a note for users to add their first ollama server. the text shoulod be muted */}
                <div className="pt-2">
                  <p className="text-xl text-neutral-500 text-center px-8">
                    {/* Run multiple Ollama servers to chat with multiple models at the same time. */}
                    Simultaneously Run Multiple Large Language Models Locally with PolyOllama.
                  </p>
                </div>

                {/* <div className="flex flex-col space-y-0 gap-0 pt-1">
                  <p className="text-xs/5">
                    powered by
                  </p>
                  <span className="text-2xl/3 font-semibold text-[#0f0f0f]">
                    Ollama
                  </span>
                </div> */}
              </div>

              {/* Create a Button to allow users to create their first ollama server */}
              {/* TODO: disable the add ollama server button when at least one chat window is in progress */}
              <div className="h-5" />
              {chatId !== undefined && conversations !== undefined && (
                <div className="py-2.5">
                  <ChatOllamaServerWarning
                    size={'lg'}
                    numOfConversationsWithoutEndpoint={numOfConversationsWithoutEndpoint}
                  />
                </div>
              )}
              <AddOllamaClientBUtton
                // if at least one chat window is in progress, disable the button
                // if the chatId is defined and the number of conversations with endpoint is not equal to the number of conversations, disable the button
                //
                disabled={atLeastOneChatWindowIsProgress() || (chatId !== undefined && numOfConversationsWithEndpoint === numOfConversations)}

              />
              < p className="text-sm text-[rgb(125,125,125)] mt-2">
                OR
              </p>
              <div className="flex flex-row items-center justify-center text-neutral-500 mt-2 mx-auto">
                {/* <p className="text-xs text-muted-foreground"> */}
                Press{" "}
                <div className="flex flex-row justify-center items-center mx-1">
                  <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-sm/4">⌘</span>
                  </kbd>
                  <span className="text-xs mx-0.5">+</span>
                  <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5  font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-base/4 ">⌥</span>
                  </kbd>
                  <span className="text-xs/4 mx-0.5">+</span>
                  <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 pb-0.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-sm ">a</span>
                  </kbd>
                </div>
                {" "}
                to add your first Conversation.
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              <div className="flex flex-row justify-start items-center h-12 mt-1.5">
                <div className="flex flex-row justify-start space-x-2 items-center">
                  <div className="flex-none self-center">
                    <Button
                      size={'icon'}
                      variant={'ghost'}
                      onClick={() => {
                        if (isSidebarOpen) {
                          closeSidebar();
                        } else {
                          openSidebar();
                        }
                      }}
                    >
                      {isSidebarOpen ?
                        <PanelRightOpen className="h-6 w-6" />
                        :
                        <PanelLeftOpen className="h-6 w-6" />}
                    </Button>

                  </div>
                  <div className="flex flex-row justify-start items-center space-x-0.5">
                    <p className="flex-none text-2xl font-semibold text-[#0f0f0f]">
                      {chatId && currentChat && (
                        // chat title can be long. It should have a max width and be ellipsized
                        <div className="max-w-[24rem] truncate">
                          <ChatTitle
                            chatId={chatId}
                            chatTitle={currentChat.chat.title}
                            location={"chat_windows"}
                          />
                        </div>
                      )}
                      {!chatId && (<span>
                        Chat with <span className="boujee-text"
                          style={{
                            // almost normal size
                            fontSize: "clamp(1.5rem, 20vw, 1rem)",

                          }}>
                          Poly</span>Ollama
                      </span>)}
                    </p>
                    {/* <AspectRatio ratio={16 / 9}> */}
                    <div className="flex-none pb-1.5">
                      <img src={polyllama} alt="Ollama" className="object-contain w-12 h-12" />
                    </div>
                    {/* </AspectRatio> */}
                  </div>
                </div>
                <div className="flex flex-1 flex-grow"></div>
                <div className="flex flex-row justify-end items-center space-x-1">
                  {chatId && conversations && (
                    <ChatOllamaServerWarning
                      numOfConversationsWithoutEndpoint={numOfConversationsWithoutEndpoint}
                      waitingModelsToRespond={atLeastOneChatWindowIsProgress()}
                    />
                  )}
                  <div className="flex-none">
                    <AddOllamaClientBUtton
                      disabled={atLeastOneChatWindowIsProgress() || (chatId !== undefined && numOfConversationsWithEndpoint === numOfConversations)}

                      size={'lg'} />
                  </div>
                </div>
              </div>
              {/* this div should cover rest of the screen */}
              <div className="flex-1 flex-grow h-full w-full">
                <div
                  className={cn("grid gap-1",
                    chatId === undefined && conversations === undefined && getGridColsClassName(endpoints.length),
                    chatId && conversations && getGridColsClassName(numOfConversationsWithEndpoint)
                  )}
                >
                  {chatId === undefined && conversations === undefined && (
                    endpoints.map((endpoint, ei) => {
                      return (
                        <div
                          className={cn(getColSpanClassName(endpoints.length, ei))}
                          key={`chat-window-${endpoint}`}
                        >
                          <ChatWindow
                            chatId={undefined}
                            conversationId={undefined}
                            endpoint={endpoint}
                            tailwindcssHeightClassName={endpoints.length <= 2 ? "h-[calc(100vh-4.5rem)]" : "h-[calc(50vh-2.40rem)]"}
                            onIncomingMessageProgress={handleIncomingMessageProgress}
                          />
                        </div>
                      )
                    })
                  )}
                  {chatId && conversations &&
                    conversations.conversations
                      .filter((conv) => conv.endpoint !== null) // filter out conversations without endpoint
                      .map((conversation, ci) => {
                        console.log(`rendering ChatWindow for endpoint: ${conversation.endpoint}`)
                        const chtid = chatId;



                        return (
                          <div
                            className={cn(getColSpanClassName(numOfConversationsWithEndpoint, ci))}
                            key={`chat-window-${conversation.endpoint}`}
                          >
                            {/* <span>{chtid}</span>
                        <span>{convId}</span> */}
                            <ChatWindow
                              chatId={chtid}
                              conversationId={conversation.conversation_id}

                              // IGNORE: because we are already filtering conversations with endpoint !== null
                              // @ts-ignore
                              endpoint={conversation.endpoint}
                              tailwindcssHeightClassName={
                                numOfConversationsWithEndpoint
                                  <= 2
                                  ?
                                  "h-[calc(100vh-4.5rem)]"
                                  :
                                  "h-[calc(50vh-2.40rem)]"}
                              onIncomingMessageProgress={handleIncomingMessageProgress}
                            />
                          </div>
                        )
                      })}
                </div>

                {/* this div is going to get long. It should be scrollable */}
                {/* <div className="h-[calc(100vh-4.5rem)] overflow-y-auto">
                <DynamicChatLayout
                  endpoints={[...endpoints]} />
              </div> */}

              </div>
            </div>
          )}
        </div>
        <>
          {/* TODO: disable the functionality of the chat send component when at least one chat window is in progress */}
          <ChatSend
            onSend={handleMessageSend}
            // chat send is disabled if at least one chat window is in progress
            // chat send is disabled if the chatId is undefined and there are no endpoints
            // chat send is disabled if the chatId is defined and conversations with endpoint is not equal to the number of conversations
            disabled={atLeastOneChatWindowIsProgress() || (chatId === undefined && endpoints.length === 0) || (chatId !== undefined && numOfConversationsWithEndpoint !== numOfConversations)}
            chat={currentChat?.chat}
          />
        </>
      </div>
    </>
  );
};

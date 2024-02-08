import { ChatWindow } from "./ChatWindow";

import { useOllamaClientsStore } from "./stores/use-ollama-clients-store";
import { ChatSend } from "./ChatSend";
import { useEffect, useState } from "react";
import { useWebSocket } from "./WebSocketContext";

import { Button, ButtonProps } from "./components/ui/button";
import { Loader2, Plus } from "lucide-react";

import { useChatEntriesStore } from "./stores/use-chat-entries";

import { v4 as uuidv4 } from "uuid";
import { cn } from "./lib/utils";
import { useChats, useChatCreate } from "./hooks/use-chats";


const AddOllamaClientBUtton = ({
  size
}: {
} & ButtonProps) => {

  const {
    endpoints,
    setEndpoints
  } = useOllamaClientsStore((state) => {
    return {
      endpoints: state.endpoints,
      setEndpoints: state.setEndpoints,
    }
  });

  const createChatEntriesByEndpoint = useChatEntriesStore((state) => state.createChatEntriesByEndpoint);

  const [addingOllamaClient, setAddingOllamaClient] = useState<boolean>(false);

  const addOllamaServer = () => {
    setAddingOllamaClient(true);
    addOllamaClient().then((newEndpoint) => {
      console.log("newEndpoint", newEndpoint.endpoint);
      setEndpoints([...endpoints, newEndpoint.endpoint]);
      createChatEntriesByEndpoint(newEndpoint.endpoint);
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
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <Button
      size={size}
      variant="default"
      className="mt-"
      onClick={() => {
        addOllamaServer();
      }}
      disabled={addingOllamaClient}
    >
      {addingOllamaClient ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus className="h-5 w-5" />}
      <span
        className="px- ml-2"
      >
        {/* {addingOllamaClient ? loadingText : "Add Ollama Client"} */}

        Add Ollama Client
      </span>
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

export const ChatWindows = ({
  chatId
}: {
  chatId?: number;
}) => {

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



  const handleMessageSend = (msg: string, model: string, images: {
    converted: Uint8Array,
    file: File
  }[] | undefined) => {
    console.log(`There are ${images?.length} images to send`);
    if (images) {
      for (const image of images) {
        console.log(`image: ${image.file.name}`);
      }
    }
    const imageFiles = images?.map((image) => {
      console.log(`image.file: ${image.file.name}`);
      return image.file
    });
    console.log(`${imageFiles?.length} images will be sent to the server and to chat entries.`);

    // here check if the endpoint is enabled for chat. If not, don't send the message to that endpoint
    for (const endpoint of endpoints) {
      addChatEntry(endpoint, {
        id: uuidv4(),
        message: {
          content: msg,
          role: "user",
          images: imageFiles,
        },
        model: "User",
        endpoint,
      })
    }
    const imagesToSend = images?.map((image) => {
      return image.converted;
    });

    console.log(`Sending message: ${msg} to model: ${model} with ${imagesToSend?.length} images`);


    // if (!chatId) {
    //   // we need to create a new chat.
    //   // associate the chat with each endpoint.
    // }


    // in the backend the server will have to know which endpoints to send the message to and which model to use
    // data.model will be used if there is no model for corresponding endpoint in endpointsSelectedModel.
    sendMessage({
      type: "chat-message",
      data: {

        // currently, the chatId is not used.
        // if there is no chatId, it means we have to create a new chat
        // chatId: TODO

        message: msg,
        model: model,
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
    if (length === 1) return "grid-cols-1";
    if (length >= 2 && length <= 4) return "grid-cols-2";
    if (length >= 5) return "grid-cols-6";
  };

  const getColSpanClassName = (length: number, index: number) => {
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
      <div className=" w-full h-screen px-1 sm:px-2 md:px-4 ">
        {endpoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full scale-100 pb-16">
            <div className="flex flex-col items-center justify-center mb-5">
              <p className="text-4xl font-semibold text-[#0f0f0f]">
                No Ollama servers found
              </p>
              {/* a note for users to add their first ollama server. the text shoulod be muted */}
              <p className="text-lg text-muted-foreground">
                Add your first Ollama server to start chatting
              </p>
            </div>

            {/* Create a Button to allow users to create their first ollama server */}
            <AddOllamaClientBUtton />
            <div className="flex flex-row items-center justify-center text-muted-foreground mt-3">
              {/* <p className="text-xs text-muted-foreground"> */}
              Press{" "}
              <div className="flex flex-row justify-center items-center mx-1">
                <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-sm">⌘</span>
                </kbd>
                <span className="text-xs mx-0.5">+</span>
                <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5  font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-base ">⌥</span>
                </kbd>
                <span className="text-xs mx-0.5">+</span>
                <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 pb-0.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-sm ">a</span>
                </kbd>
              </div>
              {" "}
              to add your first Ollama server
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <div className="flex flex-row justify-start items-center h-12 mt-1.5">
              <div className="flex flex-row justify-start">
                <p className="flex-none text-2xl font-semibold text-[#0f0f0f]">
                  Chat with Ollama ({endpoints.length})
                </p>
              </div>
              <div className="flex flex-1 flex-grow"></div>
              <div className="flex flex-row justify-end items-center pb-">
                <div className="flex-none">
                  <AddOllamaClientBUtton size={'lg'} />
                </div>
              </div>
            </div>
            {/* this div should cover rest of the screen */}
            <div className="flex-1 flex-grow h-full w-full">
              <div
                className={cn("grid gap-1", getGridColsClassName(endpoints.length))}
              >
                {endpoints.map((endpoint, ei) => {
                  console.log(`rendering ChatWindow for endpoint: ${endpoint}`)
                  return (
                    <div
                      className={cn(getColSpanClassName(endpoints.length, ei))}
                      key={`chat-window-${endpoint}`}
                    >
                      <ChatWindow
                        endpoint={endpoint}
                        tailwindcssHeightClassName={endpoints.length <= 2 ? "h-[calc(100vh-4.5rem)]" : "h-[calc(50vh-2.40rem)]"}
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
        <ChatSend onSend={handleMessageSend} />
      </>
    </>
  );
};

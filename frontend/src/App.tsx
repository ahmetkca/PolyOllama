import { WebSocketProvider, useWebSocket } from "./WebSocketContext";
import "./App.css";
import { ChatWindows, ChatWindowsProps } from "./ChatWindows";
import { useOllamaClientsStore } from "./stores/use-ollama-clients-store";
import { useEffect, useState } from "react";
import { useChatCreate, useChats } from "./hooks/use-chats";
import { useConversationCreate } from "./hooks/use-conversations";
import { v4 as uuidv4 } from "uuid";
import { useChatEntriesStore } from "./stores/use-chat-entries";
import { ChatsSideBar } from "./ChatsSideBar";
import { cn } from "./lib/utils";
import { toast } from "sonner";

function App() {

  const [currentlySelectedChat, setCurrentlySelectedChat] = useState<number | undefined>(undefined);

  const {
    endpoints: ollamaEndpoints,
    setEndpoints,
    setSelectedModelByEndpoint,
  } = useOllamaClientsStore((state) => state);

  useEffect(() => {
    if (currentlySelectedChat === undefined) {
      ollamaEndpoints.forEach((endpoint) => {
        setSelectedModelByEndpoint(endpoint, "");
      });
    }
  }, [currentlySelectedChat]);

  // by default, the status of the sidebar depends on the number of endpoints
  // if there are no endpoints, the sidebar should be open, otherwise it should be closed by default
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(ollamaEndpoints.length === 0);

  const [fetchingEndpoints, setFetchingEndpoints] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      setFetchingEndpoints(true);
      try {
        const response = await fetch("http://localhost:3000/endpoints");
        const data = await response.json();
        setEndpoints(data.endpoints);
      } catch (error: any) {
        console.error("Error fetching models", error);
      } finally {
        setFetchingEndpoints(false);
      }
    })();
  }, []);

  // const addChatEntry = useChatEntriesStore((state) => state.addChatEntry);

  const { sendMessage } = useWebSocket();

  const {
    trigger: createChat
  } = useChatCreate();

  const {
    trigger: createConversation
  } = useConversationCreate();

  const handleNewChat: ChatWindowsProps["onNewChat"] = async (
    msg,
    images,
    endpointsToChat,
    endpointsSelectedModel
  ) => {
    // we need to create a new chat.
    // associate the chat with each endpoint.
    const {
      chat_id: newChatId
    } = await createChat({ title: "New Chat" });

    // make sure each endpoint from endpointsToChat has a selected model in endpointsSelectedModel
    // if not, just return  and don't create a conversation
    for (const endpoint of endpointsToChat.keys()) {
      if (!endpointsSelectedModel.has(endpoint)) {
        console.warn(`All conversations must have a model selected.`);
        toast.error(`All conversations must have a model selected.`);
        return;
      }
    }


    // use the chatId to create conversation for each endpoint.
    const conversations = await Promise.all(
      Array.from(endpointsToChat.entries())
        .filter(([_, isEnabled]) => isEnabled)
        .map(([endpoint, _]) => {
          const mdl = endpointsSelectedModel.get(endpoint);
          if (!mdl) {
            throw new Error(`Model not found for endpoint: ${endpoint}`);
          }

          return (async () => {
            const conversation = await createConversation({
              chatId: newChatId,
              endpoint,
              // we already know that if the endpoint does not have a model, it will not be in the map.
              model: mdl,
            });
            return {
              endpoint,
              conversation_id: conversation.conversation_id,
            }
          })();
        })
    );

    console.log("HANDLE_NEW_MESSAGE", conversations);

    // const imageFiles = images?.map((image) => {
    //   console.log(`image.file: ${image.file.name}`);
    //   return image.file
    // });

    // here check if the endpoint is enabled for chat. If not, don't send the message to that endpoint
    // for (const [endpoint, isEnabled] of endpointsToChat.entries()) {
    //   if (!isEnabled) continue;
    //   addChatEntry(endpoint, {
    //     id: uuidv4(),
    //     message: {
    //       content: msg,
    //       role: "user",
    //       images: imageFiles,
    //     },
    //     model: "User",
    //     endpoint,
    //     chatId: newChatId,
    //     conversationId: conversations.find((conversation) => conversation.endpoint === endpoint)?.conversation_id || -1,
    //   })
    // }
    const imagesToSend = images?.map((image) => {
      return image.converted;
    });

    console.log(`Sending message: ${msg} with ${imagesToSend?.length} images`);


    // in the backend the server will have to know which endpoints to send the message to and which model to use
    // data.model will be used if there is no model for corresponding endpoint in endpointsSelectedModel.
    // setTimeout(() => {
    // send the message to the server with delay so 

    sendMessage({
      type: "chat-message",
      data: {
        // isFirstMessage is used to determine if this is first time the user is sending a message to the associated chat.
        isFirstMessage: true,

        // currently, the chatId is not used.
        // if there is no chatId, it means we have to create a new chat

        chatId: newChatId,
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
    setCurrentlySelectedChat(newChatId);
    // }, 0);/*Math.floor(Math.random() * 10) + 5);*/
  }

  return (

    <div className="containerr mx-auto h-screen">
      {fetchingEndpoints ? (
        <div className="flex flex-col justify-center items-center h-full">
          <p className="text-2xl font-semibold text-[#0f0f0f]">
            Looking for available Ollama instances...
          </p>
          <p className="text-sm text-muted font-light">
            Default Ollama server that is running on port 11434 will not be listed here.
          </p>
        </div>
      ) : (
        <div className="flex flex-row h-full">

          <div className="flex-shrink-0">
            <ChatsSideBar
              activeChatId={currentlySelectedChat}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              onChatSelect={(chatId) => {
                setCurrentlySelectedChat(chatId);
              }}
            />
          </div>
          <div className={cn(
            "flex-1 transition-all duration-300 ease-in-out",
            isSidebarOpen ? "ml-64" : "ml-0"
          )}>
            <ChatWindows
              chatId={currentlySelectedChat}
              onNewChat={handleNewChat}
              onChatChange={(changedChatId) => {
                setCurrentlySelectedChat(changedChatId);
              }}
              isSidebarOpen={isSidebarOpen}
              openSidebar={() => setIsSidebarOpen(true)}
              closeSidebar={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

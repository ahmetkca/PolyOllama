import { WebSocketProvider } from "./WebSocketContext";
import "./App.css";
import { ChatWindows } from "./ChatWindows";
import { useOllamaClientsStore } from "./stores/use-ollama-clients-store";
import { useEffect, useState } from "react";

function App() {
  const {
    setEndpoints
  } = useOllamaClientsStore((state) => state);

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

  return (
    <WebSocketProvider host="127.0.0.1" port={3333}>
      <div className="containerr mx-auto h-screen">
        {fetchingEndpoints ? (
          <div className="flex flex-row justify-center items-center h-full">
            <p className="text-2xl font-semibold text-[#0f0f0f]">
              Looking for online Ollama servers...
            </p>
            <p className="text-xs text-muted font-light">
              Default Ollama server that is running on port 11434 will not be listed here.
            </p>
          </div>
        ) : (
          <ChatWindows />
        )}
      </div>
    </WebSocketProvider>
  );
}

export default App;

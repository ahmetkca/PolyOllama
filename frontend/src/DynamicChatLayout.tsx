import React, { useEffect, useState } from "react"
import { ChatWindow } from "./ChatWindow";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable";
import { nanoid } from "nanoid";

// prevent re-rendering of the chat windows unless endpoints change
const DynamicChatLayout = ({
    endpoints
}: {
    endpoints: string[];
}) => {

    // const { sentMessage } = useSentMessage();

    const smallViewport = (width: number) => width < 768;
    const mediumViewport = (width: number) => width >= 768 && width < 1024;
    const largeViewport = (width: number) => width >= 1024 && width < 1280;
    const xlargeViewport = (width: number) => width >= 1280;
    const [maxPanelsPerGroup, setMaxPanelsPerGroup] = useState(3);

    useEffect(() => {
        const updatePanelCountBasedOnViewport = () => {
            const width = window.innerWidth;
            if (smallViewport(width)) {
                setMaxPanelsPerGroup(1);
            } else if (mediumViewport(width)) {
                setMaxPanelsPerGroup(2);
            } else if (largeViewport(width)) {
                setMaxPanelsPerGroup(3); // Large viewport
            } else if (xlargeViewport(width)) {
                setMaxPanelsPerGroup(4); // XLarge viewport
            } else {
                setMaxPanelsPerGroup(5);
            }
        };

        // Set the initial value
        updatePanelCountBasedOnViewport();

        // Update the value on resize
        window.addEventListener('resize', updatePanelCountBasedOnViewport);

        // Cleanup listener
        return () => window.removeEventListener('resize', updatePanelCountBasedOnViewport);
    }, []);

    const renderPanels = () => {
        // // console.log(`sentMessage:`)
        // // console.log(sentMessage);
        const tempEndpoints = [...endpoints];
        const panels = [];
        let remaining = endpoints.length;

        while (remaining > 0) {
            // // console.log(`remaining: ${remaining}`);
            let panelCount = Math.min(remaining, maxPanelsPerGroup);
            remaining -= panelCount;

            const panelGroup = (
                <ResizablePanel key={nanoid()}
                    // id={nanoid()} 
                    className=""
                >
                    <ResizablePanelGroup direction="horizontal" className="">
                        {
                            Array.from({ length: panelCount }, (_, i) => (
                                <React.Fragment key={nanoid()} >
                                    {i > 0 && <ResizableHandle withHandle />}
                                    <ResizablePanel
                                        key={nanoid()}
                                        // id={nanoid()}
                                        className=""
                                    >
                                        <ChatWindow
                                            endpoint={tempEndpoints.shift() as string}
                                            onIncomingMessageProgress={(_1, _2, _3) => { }}
                                        // sentMessage={sentMessage}
                                        />
                                    </ResizablePanel>
                                </React.Fragment>
                            ))
                        }
                    </ResizablePanelGroup >
                </ResizablePanel >
            );

            panels.push(panelGroup);

            if (remaining > 0) {
                // console.log(`Adding handle between panel groups`);
                panels.push(<ResizableHandle key={`handle-${nanoid()}`} withHandle />);
            }
        }

        return panels;
    };

    return (
        <ResizablePanelGroup direction="vertical" className="w-full rounded-lg border"

        // id={nanoid()}
        >
            {renderPanels()}
        </ResizablePanelGroup>
    );
}


export default DynamicChatLayout;
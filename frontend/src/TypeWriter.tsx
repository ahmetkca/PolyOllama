// import { useEffect, useState } from "react";
// import { cn } from "./lib/utils";



// interface TypeWriterProps {
//     text: string;
//     speed: number;
//     onlyOnce?: boolean; // only type the text once, then stop.
//     className?: string;
//     onTypingEnd?: () => void;
// }


// function TypeWriter({
//     text,
//     speed,
//     onlyOnce = false,
//     className = "",
//     onTypingEnd,
// }: TypeWriterProps) {
//     const [displayText, setDisplayText] = useState("");
//     const [index, setIndex] = useState(0);

//     useEffect(() => {
//         const interval = setInterval(() => {
//             if (index < text.length) {
//                 setDisplayText((prev) => prev + text[index]);
//                 setIndex((prev) => prev + 1);
//             } else {
//                 if (onlyOnce) {
//                     clearInterval(interval);
//                 }
//                 if (onTypingEnd) {
//                     onTypingEnd();
//                 }
//             }
//         }, speed);

//         return () => clearInterval(interval);
//     }, [index, text, speed, onlyOnce, onTypingEnd]);

//     return <span className={
//         cn(
//             "whitespace-nowrap",
//             className
//         )
//     }>{displayText}</span>;
// }


// export default TypeWriter;


// SECOND VERSION
// import { useEffect, useState, useRef } from "react";

// interface TypeWriterProps {
//     text: string;
//     speed: number;
//     className?: string;
//     onTypingEnd?: () => void;
//     mode: "continuous" | "once" | "manual"; // Define mode prop
//     triggerEffect?: number | boolean; // Optional for manual trigger
// }

// function TypeWriter({
//     text,
//     speed,
//     className = "",
//     onTypingEnd,
//     mode,
//     triggerEffect = false, // Default to false for manual mode
// }: TypeWriterProps) {
//     const [displayText, setDisplayText] = useState("");
//     const [index, setIndex] = useState(0);
//     const typingCompleted = useRef(false); // To track if typing has completed

//     // Effect for typing logic
//     useEffect(() => {
//         if (mode === "manual" && !triggerEffect) {
//             // In manual mode, do nothing until triggerEffect is true
//             return;
//         }

//         if (mode === "once" && typingCompleted.current) {
//             // In once mode, do not restart if typing has already completed
//             return;
//         }

//         const interval = setInterval(() => {
//             if (index < text.length) {
//                 setDisplayText((prev) => prev + text[index]);
//                 setIndex((prev) => prev + 1);
//             } else {
//                 clearInterval(interval);
//                 typingCompleted.current = true; // Mark typing as completed
//                 if (onTypingEnd) {
//                     onTypingEnd();
//                 }
//                 if (mode !== "continuous") {
//                     // In modes other than continuous, prevent further typing
//                     return;
//                 }
//             }
//         }, speed);

//         return () => clearInterval(interval);
//     }, [index, text, speed, mode, triggerEffect, onTypingEnd]);

//     // Effect to reset for manual trigger or continuous mode
//     useEffect(() => {
//         if ((mode === "manual" && triggerEffect) || mode === "continuous") {
//             setDisplayText("");
//             setIndex(0);
//             // Optionally reset typingCompleted for continuous mode or if required for manual
//             typingCompleted.current = false;
//         }
//     }, [triggerEffect, mode]);

//     return <span className={className}>{displayText}</span>;
// }

// export default TypeWriter;


import { useEffect, useState, useRef } from "react";

interface TypeWriterProps {
    text: string;
    speed: number;
    className?: string;
    onTypingEnd?: () => void;
    mode: "continuous" | "once" | "manual";
    triggerEffect?: number | boolean; // Optional for manual trigger
}

function TypeWriter({
    text,
    speed,
    className = "",
    onTypingEnd,
    mode,
    triggerEffect = false,
}: TypeWriterProps) {
    const [displayText, setDisplayText] = useState(mode === "manual" ? text : "");
    const [index, setIndex] = useState(0);
    const typingCompleted = useRef(false);

    useEffect(() => {
        // For manual mode, don't start typing until triggered
        if (mode === "manual" && !triggerEffect) return;

        // For once mode, don't restart if already completed
        if (mode === "once" && typingCompleted.current) return;

        // Start or continue typing
        const interval = setInterval(() => {
            if (index < text.length) {
                setDisplayText((prev) => mode === "manual" && index === 0 ? text.charAt(0) : prev + text[index]);
                setIndex((prev) => prev + 1);
            } else {
                clearInterval(interval);
                typingCompleted.current = true;
                if (onTypingEnd) onTypingEnd();

                // For continuous mode, reset to start over
                if (mode === "continuous") {
                    setDisplayText("");
                    setIndex(0);
                    typingCompleted.current = false;
                }
            }
        }, speed);

        return () => clearInterval(interval);
    }, [index, text, speed, mode, triggerEffect, onTypingEnd]);

    useEffect(() => {
        // Reset for manual trigger
        if (mode === "manual") {
            if (triggerEffect) {
                setDisplayText("");
                setIndex(0);
                typingCompleted.current = false;
            } else {
                // Initially set full text without triggering the effect
                setDisplayText(text);
            }
        }
    }, [triggerEffect, mode, text]);

    return <span className={className}>{displayText}</span>;
}

export default TypeWriter;

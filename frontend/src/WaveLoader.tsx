// WaveLoader.tsx
import React, { useEffect, useState } from 'react';

interface WaveLoaderProps {
    dotCount: number;
    animationSpeed: number; // in milliseconds
}

const WaveLoader: React.FC<WaveLoaderProps> = ({ dotCount, animationSpeed }) => {
    const [activeDot, setActiveDot] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveDot((prevActiveDot) => (prevActiveDot + 1) % dotCount);
        }, animationSpeed);

        return () => clearInterval(interval);
    }, [dotCount, animationSpeed]);

    return (
        <div className="flex space-x-[3px]">
            {Array.from({ length: dotCount }).map((_, index) => (
                <div
                    key={index}
                    className={`w-2 h-2 bg-black rounded-full  transition-all duration-300 ${index === activeDot ? 'transform scale-150' : ''
                        }`}
                ></div>
            ))}
        </div>
    );
};

export default WaveLoader;

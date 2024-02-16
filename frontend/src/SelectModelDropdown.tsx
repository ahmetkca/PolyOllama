import { memo, useState } from "react";
import { useModels } from "./hooks/use-models";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import { Button } from "./components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./components/ui/command";
import { cn } from "./lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";



export const SelectModel = memo((
    {
        disabled = false,
        endpoint,
        modelName,
        onModelChange
    }: {
        disabled?: boolean;
        endpoint?: string;
        modelName?: string;
        onModelChange: (model: string) => void;
    }
) => {

    const [open, setOpen] = useState(false);

    const { models, isError, isLoading } = useModels(endpoint);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    disabled={disabled}
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-56 justify-between"
                >
                    {/* model name must not overflow the button */}
                    <span className="truncate">{modelName && modelName !== "" ? modelName : "Select a model"}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                // responsive width
                className="w-56 p-0"
            >

                <Command>
                    <CommandInput placeholder="Search for a model" />
                    <CommandList>
                        <CommandEmpty>
                            {isLoading ? "Loading..." : isError ? "Error loading models" : "No models found"}
                        </CommandEmpty>
                        {/* the command item's model names should be truncated */}
                        {/* inside this component there are p tags as childs they should not exceed the scrollarea container */}

                        {/* <ScrollArea className="h-72 w-56"> */}

                        <CommandGroup
                            className="w-56"
                        >
                            {!isLoading && models?.models.map((model) => (
                                <CommandItem
                                    key={model.name}
                                    value={model.name}
                                    onSelect={(currentValue) => {
                                        console.log("currentValue", currentValue);
                                        onModelChange(currentValue);
                                        setOpen(false)
                                    }}
                                >
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center justify-start w-full pr-1 py-0.5">
                                                    {(
                                                        <span className="flex-none flex-shrink-0">
                                                            <span className="sr-only">Selected</span>
                                                            <Check className={cn("mr-2 h-4 w-4", model.name === modelName ? "text-primary opacity-100" : "text-gray-400 opacity-0")} />
                                                        </span>
                                                    )}
                                                    {/* model name must not overflow the popover content */}
                                                    <p className={cn("truncate", model.name === modelName ? "text-primary" : "text-gray-900")}>
                                                        {model.name}
                                                    </p>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="grid gap-2">
                                                    <div className="text-sm font-semibold">{model.name}</div>
                                                    <div className="grid grid-cols-2 gap-1">
                                                        <div className="text-gray-500">
                                                            Family
                                                        </div>
                                                        <div className="text-gray-900">
                                                            {model.details.family}
                                                        </div>
                                                        <div className="text-gray-500">
                                                            Format
                                                        </div>
                                                        <div className="text-gray-900">
                                                            {model.details.format}
                                                        </div>
                                                        <div className="text-gray-500">
                                                            Parameter size
                                                        </div>
                                                        <div className="text-gray-900">
                                                            {model.details.parameter_size}
                                                        </div>
                                                        <div className="text-gray-500">
                                                            Quantization level
                                                        </div>
                                                        <div className="text-gray-900">
                                                            {model.details.quantization_level}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </CommandItem>
                            ))}

                        </CommandGroup>
                    </CommandList>
                </Command>

            </PopoverContent>
        </Popover>
    )
});

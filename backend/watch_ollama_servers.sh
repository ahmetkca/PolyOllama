#!/bin/bash

# Define an array of colors
colors=("red" "green" "blue" "magenta" "cyan" "yellow" "white")

# Build the multitail command
multitail_cmd="multitail"
color_index=0

for file in output_114*; do
    # Append file with color to the command
    multitail_cmd+=" -ci ${colors[color_index]} \"$file\""
    color_index=$(( (color_index + 1) % ${#colors[@]} ))
done

# Execute the multitail command
eval $multitail_cmd


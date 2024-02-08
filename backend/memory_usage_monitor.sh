#!/bin/bash

# Interval in seconds for checking memory usage
interval=5

# File to store memory usage data
mem_usage_file="ollama_memory_usage.log"

# Clear the memory usage file
> "$mem_usage_file"

while true; do
    echo "Memory usage at $(date):" >> "$mem_usage_file"
    
    # Use pgrep to find all ollama processes and ps for memory info
    pgrep -fl ollama | awk '{print $1}' | while read pid; do
        mem_usage=$(ps -o %mem -p $pid | tail -n 1)
        echo "PID $pid: $mem_usage%" >> "$mem_usage_file"
    done

    echo "-----" >> "$mem_usage_file"

    # Wait for specified interval
    sleep $interval
done


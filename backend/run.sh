# #!/bin/bash
#
# # Define the starting port and the number of times to run the command
# start_port=111435
# n=8
#
# # Define an array of ANSI color codes
# colors=(31 32 33 34 35 36 37)
#
# for ((i=0; i<n; i++)); do
#     # Calculate the current port
#     current_port=$((start_port + i))
#
#     # Select a color code from the array
#     color=${colors[i % ${#colors[@]}]}
#
#     # Prefix with host:port in selected color
#     echo -e "\e[${color}mhost:127.0.0.1:$current_port\e[0m"
#
#     # Run the command in the background and redirect its output
#     # Note: Adjust 'ollama serve' as needed to fit your command structure
#     OLLAMA_HOST="127.0.0.1:$current_port" ollama serve > "output_$current_port.log" 2>&1 &
#
#     # Optional: sleep for a short duration if needed between starts
#     # sleep 1
# done
#
# # Reminder to the user
# echo "Commands are running in the background. Check output_[port].log files for logs."
# echo "To stop all commands, run 'pkill -f ollama serve'."

#!/bin/bash

# Check if two arguments are provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 start_port n"
    exit 1
fi

# Read arguments from the command line
start_port=$1
n=$2

# Define an array of ANSI color codes
colors=(31 32 33 34 35 36 37)

# File to store PIDs of the background processes
pid_file="ollama_pids.txt"

# Clear PID file and output logs
> "$pid_file"
for ((i=0; i<n; i++)); do
    rm -f "output_$((start_port + i)).log"
done

for ((i=0; i<n; i++)); do
    # Calculate the current port
    current_port=$((start_port + i))

    # Select a color code from the array
    color=${colors[i % ${#colors[@]}]}

    # Prefix with host:port in selected color
    echo -e "\e[${color}mhost:127.0.0.1:$current_port\e[0m"

    # Run the command in the background and redirect its output
    OLLAMA_HOST="127.0.0.1:$current_port" ollama serve > "output_$current_port.log" 2>&1 &
    
    # Save the PID
    echo $! >> "$pid_file"

    # Optional: sleep for a short duration if needed between starts
    # sleep 1
done

# Reminder to the user
echo "Commands are running in the background. Check output_[port].log files for logs."
echo "Use 'kill \$(cat $pid_file)' to stop all processes."



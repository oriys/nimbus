package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
)

type Event struct {
	Name string `json:"name"`
}

type Response struct {
	Message string `json:"message"`
}

func main() {
	input, err := io.ReadAll(os.Stdin)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read stdin: %v\n", err)
		os.Exit(1)
	}

	var event Event
	if err := json.Unmarshal(input, &event); err != nil {
		// If not JSON, use raw input as name
		event.Name = string(input)
	}

	if event.Name == "" {
		event.Name = "World"
	}

	resp := Response{
		Message: fmt.Sprintf("Hello, %s from Go!", event.Name),
	}

	output, _ := json.Marshal(resp)
	fmt.Print(string(output))
}

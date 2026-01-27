package main

import (
	"context"
	"fmt"
	"os"

	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/imports/wasi_snapshot_preview1"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run test_wasm.go <handler.wasm>")
		os.Exit(1)
	}

	wasmPath := os.Args[1]
	wasmBytes, err := os.ReadFile(wasmPath)
	if err != nil {
		fmt.Printf("Failed to read wasm: %v\n", err)
		os.Exit(1)
	}

	ctx := context.Background()
	runtime := wazero.NewRuntime(ctx)
	defer runtime.Close(ctx)

	wasi_snapshot_preview1.MustInstantiate(ctx, runtime)

	module, err := runtime.Instantiate(ctx, wasmBytes)
	if err != nil {
		fmt.Printf("Failed to instantiate: %v\n", err)
		os.Exit(1)
	}
	defer module.Close(ctx)

	// Check exports
	alloc := module.ExportedFunction("alloc")
	handle := module.ExportedFunction("handle")

	if alloc == nil {
		fmt.Println("ERROR: missing 'alloc' export")
		os.Exit(1)
	}
	if handle == nil {
		fmt.Println("ERROR: missing 'handle' export")
		os.Exit(1)
	}

	fmt.Println("✓ alloc function found")
	fmt.Println("✓ handle function found")

	// Test execution
	input := []byte(`{"name":"test"}`)

	// Allocate input buffer
	results, err := alloc.Call(ctx, uint64(len(input)))
	if err != nil {
		fmt.Printf("alloc failed: %v\n", err)
		os.Exit(1)
	}
	inputPtr := uint32(results[0])
	fmt.Printf("✓ alloc(%d) = %d\n", len(input), inputPtr)

	// Write input to memory
	memory := module.Memory()
	if !memory.Write(inputPtr, input) {
		fmt.Println("ERROR: failed to write to memory")
		os.Exit(1)
	}
	fmt.Printf("✓ wrote input to memory at ptr=%d\n", inputPtr)

	// Call handle
	results, err = handle.Call(ctx, uint64(inputPtr), uint64(len(input)))
	if err != nil {
		fmt.Printf("handle failed: %v\n", err)
		os.Exit(1)
	}

	packed := results[0]
	outPtr := uint32(packed >> 32)
	outLen := uint32(packed & 0xFFFFFFFF)
	fmt.Printf("✓ handle returned ptr=%d, len=%d\n", outPtr, outLen)

	// Read output
	output, ok := memory.Read(outPtr, outLen)
	if !ok {
		fmt.Println("ERROR: failed to read output from memory")
		os.Exit(1)
	}

	fmt.Printf("✓ Output: %s\n", string(output))
	fmt.Println("\n🎉 WebAssembly runtime works!")
}

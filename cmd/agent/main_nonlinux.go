//go:build !linux
// +build !linux

package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Fprintln(os.Stderr, "agent is only supported on Linux (Firecracker/vsock)")
	os.Exit(1)
}

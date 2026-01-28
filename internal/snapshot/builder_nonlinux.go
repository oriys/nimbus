//go:build !linux
// +build !linux

// Package snapshot 提供函数级快照管理功能。
package snapshot

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/oriys/nimbus/internal/domain"
	"github.com/sirupsen/logrus"
)

// FirecrackerBuilder 在非 Linux 平台上的 stub 实现
type FirecrackerBuilder struct {
	logger *logrus.Logger
}

// NewFirecrackerBuilderStub 创建 stub 构建器（非 Linux 平台）
func NewFirecrackerBuilderStub(logger *logrus.Logger) *FirecrackerBuilder {
	return &FirecrackerBuilder{
		logger: logger,
	}
}

// BuildSnapshot 在非 Linux 平台上创建占位快照
func (b *FirecrackerBuilder) BuildSnapshot(ctx context.Context, fn *domain.Function, version int, snapshotPath string) (memSize, stateSize int64, err error) {
	b.logger.WithFields(logrus.Fields{
		"function_id":   fn.ID,
		"version":       version,
		"snapshot_path": snapshotPath,
	}).Warn("Firecracker snapshots not supported on this platform, creating placeholder")

	// 创建占位文件
	memPath := filepath.Join(snapshotPath, "mem")
	statePath := filepath.Join(snapshotPath, "snapshot")

	placeholder := []byte(fmt.Sprintf("placeholder-nonlinux-%s-v%d", fn.ID, version))

	if err := os.WriteFile(memPath, placeholder, 0644); err != nil {
		return 0, 0, fmt.Errorf("failed to create mem placeholder: %w", err)
	}
	if err := os.WriteFile(statePath, placeholder, 0644); err != nil {
		return 0, 0, fmt.Errorf("failed to create state placeholder: %w", err)
	}

	memInfo, _ := os.Stat(memPath)
	stateInfo, _ := os.Stat(statePath)

	return memInfo.Size(), stateInfo.Size(), nil
}

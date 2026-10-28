// SPDX-License-Identifier: AGPL-3.0-only

package platform

import (
	"os"
	"testing"
)

func TestIsProcessAlive(t *testing.T) {
	currentPID := os.Getpid()
	if !IsProcessAlive(currentPID) {
		t.Errorf("expected current process PID %d to be alive", currentPID)
	}

	if IsProcessAlive(-1) {
		t.Errorf("expected negative PID to not be alive")
	}

	if IsProcessAlive(0) {
		t.Errorf("expected PID 0 to not be alive")
	}

	// Unlikely high PID
	if IsProcessAlive(999999999) {
		t.Logf("PID 999999999 happened to be alive, which is rare but possible")
	}
}

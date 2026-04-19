package logger

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"sync"

	"github.com/charmbracelet/lipgloss"
)

// Define Styles (Computed once for performance)
var (
	styleTime = lipgloss.NewStyle().
			Foreground(lipgloss.Color("241")). // Dark Gray
			Faint(true)

	styleKey = lipgloss.NewStyle().
			Foreground(lipgloss.Color("244")). // Light Gray
			Italic(true)

	styleVal = lipgloss.NewStyle().
			Foreground(lipgloss.Color("250")) // Whiteish

	// Status Pills
	styleStatus200 = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#000000")).
			Background(lipgloss.Color("#86efac")). // Green-300
			Padding(0, 1)

	styleStatus400 = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#000000")).
			Background(lipgloss.Color("#fde047")). // Yellow-300
			Padding(0, 1)

	styleStatus500 = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#ffffff")).
			Background(lipgloss.Color("#ef4444")). // Red-500
			Padding(0, 1)

	styleMethod = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("39")) // Blue
)

type PrettyHandler struct {
	w  io.Writer
	mu *sync.Mutex
}

func NewPrettyHandler(w io.Writer) *PrettyHandler {
	return &PrettyHandler{
		w:  w,
		mu: &sync.Mutex{},
	}
}

// Enabled always returns true for now (logs everything)
func (h *PrettyHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return true
}

// Handle is where the magic happens
func (h *PrettyHandler) Handle(ctx context.Context, r slog.Record) error {
	// 1. Collect Attributes into a Map for easy access
	attrs := make(map[string]slog.Value)
	r.Attrs(func(a slog.Attr) bool {
		attrs[a.Key] = a.Value
		return true
	})

	// 2. Format Timestamp (HH:MM:SS)
	ts := styleTime.Render(r.Time.Format("15:04:05"))

	// 3. Determine if this is an HTTP Request Log
	// Echo logs usually have "status", "method", "uri"
	var msg string
	if statusVal, ok := attrs["status"]; ok {
		// --- HTTP REQUEST MODE ---
		status := int(statusVal.Int64())
		method := attrs["method"].String()
		uri := attrs["uri"].String()
		latency := attrs["latency"].String() // e.g. "1.2ms"

		// Colorize Status
		var statusStr string
		switch {
		case status >= 500:
			statusStr = styleStatus500.Render(fmt.Sprintf("%d", status))
		case status >= 400:
			statusStr = styleStatus400.Render(fmt.Sprintf("%d", status))
		default:
			statusStr = styleStatus200.Render(fmt.Sprintf("%d", status))
		}

		// Colorize Method
		methodStr := styleMethod.Render(fmt.Sprintf("% -6s", method))

		// Build the "Table" line
		// TIME | STATUS | METHOD | URI | LATENCY | ERROR
		msg = fmt.Sprintf("%s %s %s %s %s", ts, statusStr, methodStr, uri, styleKey.Render(latency))

		// If there is an error, add it in RED at the end
		if errVal, ok := attrs["error"]; ok {
			errMsg := lipgloss.NewStyle().Foreground(lipgloss.Color("#ef4444")).Render(errVal.String())
			msg += fmt.Sprintf("\n      └── %s", errMsg)
		}

	} else {
		// --- STANDARD LOG MODE ---
		// e.g. "ARGUS Compute Plane starting"
		levelStyle := lipgloss.NewStyle().Bold(true)
		switch r.Level {
		case slog.LevelError:
			levelStyle = levelStyle.Foreground(lipgloss.Color("#ef4444")) // Red
		case slog.LevelWarn:
			levelStyle = levelStyle.Foreground(lipgloss.Color("#fde047")) // Yellow
		case slog.LevelInfo:
			levelStyle = levelStyle.Foreground(lipgloss.Color("#3b82f6")) // Blue
		}

		lvl := levelStyle.Render(fmt.Sprintf("| % -4s |", r.Level.String()))
		msg = fmt.Sprintf("%s %s %s", ts, lvl, styleVal.Render(r.Message))

		// Print remaining key-values cleanly
		for k, v := range attrs {
			if k == "error" {
				continue
			} // Handled separately
			msg += fmt.Sprintf(" %s=%s", styleKey.Render(k), v.String())
		}
	}

	// 4. Write to output (Thread safe)
	h.mu.Lock()
	defer h.mu.Unlock()
	fmt.Fprintln(h.w, msg)

	return nil
}

// Required stub methods for slog.Handler interface
func (h *PrettyHandler) WithAttrs(attrs []slog.Attr) slog.Handler { return h }
func (h *PrettyHandler) WithGroup(name string) slog.Handler       { return h }

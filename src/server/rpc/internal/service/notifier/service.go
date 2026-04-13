package notifier

import (
	"argus-rpc/internal/core"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	hermes "github.com/yrrrrrf/hermes/src"
)

type Service struct {
	engine *hermes.Engine
	queue  chan core.NotificationRequest
	wg     sync.WaitGroup
	apiURL string // Added to fetch templates
	apiKey string
}

func New(engine *hermes.Engine, apiURL, apiKey string) *Service {
	s := &Service{
		engine: engine,
		queue:  make(chan core.NotificationRequest, 100),
		apiURL: apiURL,
		apiKey: apiKey,
	}
	// Start the background worker
	s.wg.Add(1)
	go s.worker()
	return s
}

func (s *Service) Send(ctx context.Context, req core.NotificationRequest) error {
	select {
	case s.queue <- req:
		return nil // Accepted
	default:
		return fmt.Errorf("notification queue is full")
	}
}

// Shutdown closes the channel and waits for the worker to drain
func (s *Service) Shutdown(ctx context.Context) error {
	close(s.queue) // Stop accepting new items

	// Wait for worker to finish, OR for context to timeout
	c := make(chan struct{})
	go func() {
		defer close(c)
		s.wg.Wait()
	}()

	select {
	case <-c:
		return nil // Drained successfully
	case <-ctx.Done():
		return fmt.Errorf("shutdown context timed out, some notifications may be lost")
	}
}

func (s *Service) worker() {
	defer s.wg.Done()
	for req := range s.queue {
		// Create a detached context for background execution
		// We give it a generous timeout since it's background work
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)

		// 1. Resolve Template if Key is provided
		subject := req.Subject
		body := req.Body

		if req.TemplateKey != "" {
			tmpl, err := s.fetchTemplate(ctx, req.TemplateKey, req.Locale)
			if err != nil {
				slog.Error("Template fetch failed", "key", req.TemplateKey, "error", err)
				// Fallback to raw values or error out. For now, we continue if subject/body were manually provided.
			} else {
				// Simple variable substitution (Handlebars-lite)
				subject = replaceVars(tmpl.SubjectTemplate, req.Variables)
				body = replaceVars(tmpl.BodyHTML, req.Variables)
			}
		}

		msg := hermes.Message{
			Channel:   hermes.ChannelType(req.Channel),
			Recipient: req.Recipient,
			Subject:   subject,
			Body:      body,
		}

		if err := s.engine.Send(ctx, msg); err != nil {
			slog.Error("Async notification failed",
				"error", err,
				"recipient", req.Recipient,
				"channel", req.Channel,
			)
		}
		cancel()
	}
}

type emailTemplate struct {
	SubjectTemplate string `json:"subject_template"`
	BodyHTML        string `json:"body_html"`
}

func (s *Service) fetchTemplate(ctx context.Context, key, locale string) (*emailTemplate, error) {
	if locale == "" {
		locale = "en"
	}
	// Fetch from api.email_templates view
	// URL: /api/email_templates?template_key=eq.{key}&locale=eq.{locale}
	u := fmt.Sprintf("%s/email_templates?template_key=eq.%s&locale=eq.%s",
		s.apiURL, url.QueryEscape(key), url.QueryEscape(locale))

	r, err := http.NewRequestWithContext(ctx, "GET", u, nil)
	if err != nil {
		return nil, err
	}

	r.Header.Set("apikey", s.apiKey)
	r.Header.Set("Authorization", "Bearer "+s.apiKey)
	r.Header.Set("Accept-Profile", "api")

	resp, err := http.DefaultClient.Do(r)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}

	var rows []emailTemplate
	if err := json.NewDecoder(resp.Body).Decode(&rows); err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("template not found")
	}
	return &rows[0], nil
}

func replaceVars(tmpl string, vars map[string]interface{}) string {
	res := tmpl
	for k, v := range vars {
		placeholder := fmt.Sprintf("{{%s}}", k)
		val := fmt.Sprintf("%v", v)
		res = strings.ReplaceAll(res, placeholder, val)
	}
	return res
}

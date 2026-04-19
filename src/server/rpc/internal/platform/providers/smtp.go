package providers

import (
	"context"
	"fmt"
	"net/smtp"
	"strings"
)

type SMTPProvider struct {
	host string
	port int
	user string
	pass string
}

func NewSMTP(host string, port int, user, pass string) *SMTPProvider {
	return &SMTPProvider{
		host: host,
		port: port,
		user: user,
		pass: pass,
	}
}

func (s *SMTPProvider) SendEmail(ctx context.Context, to, subject, htmlBody string) error {
	addr := fmt.Sprintf("%s:%d", s.host, s.port)
	auth := smtp.PlainAuth("", s.user, s.pass, s.host)

	// Minimal headers
	msg := []byte(fmt.Sprintf("To: %s\r\n"+
		"Subject: %s\r\n"+
		"MIME-Version: 1.0\r\n"+
		"Content-Type: text/html; charset=\"UTF-8\"\r\n"+
		"\r\n"+
		"%s\r\n", to, subject, htmlBody))

	// Note: smtp.SendMail is a blocking call and doesn't take context directly
	// To respect context cancellation, we would need a more complex implementation
	// or run it in a goroutine with a select.
	// For simplicity in this optimization pass (where we already have async worker),
	// we assume the worker's context logic is sufficient for overall timeout management.

	// Check context before sending
	if ctx.Err() != nil {
		return ctx.Err()
	}

	err := smtp.SendMail(addr, auth, s.user, []string{to}, msg)
	if err != nil {
		// Basic error sanitization
		if strings.Contains(err.Error(), "authentication failed") {
			return fmt.Errorf("smtp auth failed")
		}
		return err
	}

	return nil
}

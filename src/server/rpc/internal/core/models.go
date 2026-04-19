package core

// NotificationRequest defines the payload for sending alerts via Hermes.
type NotificationRequest struct {
	OrderID     string                 `json:"order_id,omitempty"`
	Channel     string                 `json:"channel"`   // "email", "sms", "webhook"
	Recipient   string                 `json:"recipient"` // Email address or Phone number
	TemplateKey string                 `json:"template_key,omitempty"`
	Locale      string                 `json:"locale,omitempty"`
	Subject     string                 `json:"subject,omitempty"` // Override
	Body        string                 `json:"body,omitempty"`    // Override
	Variables   map[string]interface{} `json:"variables,omitempty"`
}

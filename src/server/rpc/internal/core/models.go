package core

// GenerateRequest is the input for the Universal Document Engine.

type GenerateRequest struct {

	RecordID string `json:"record_id"`

	Template string `json:"template"` // e.g. "commerce/corporate_blue"

	Options  struct {

		ForceRegenerate bool `json:"force_regenerate"`

	} `json:"options"`

}



// GenerateResponse returns the result of a document generation

type GenerateResponse struct {

	PDFBase64    string `json:"pdf_base64"`

	GeneratedBy  string `json:"generated_by"`

	CacheStatus  string `json:"cache_status"` // "hit" or "miss"

	FileSize     int64  `json:"file_size"`

}



// NotificationRequest defines the payload for sending alerts via Hermes.

type NotificationRequest struct {

	OrderID        string                 `json:"order_id,omitempty"`

	Channel        string                 `json:"channel"`   // "email", "sms", "webhook"

	Recipient      string                 `json:"recipient"` // Email address or Phone number

	TemplateKey    string                 `json:"template_key,omitempty"`

	Locale         string                 `json:"locale,omitempty"`

	Subject        string                 `json:"subject,omitempty"` // Override

	Body           string                 `json:"body,omitempty"`    // Override

	Variables      map[string]interface{} `json:"variables,omitempty"`

}

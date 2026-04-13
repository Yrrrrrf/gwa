package grpc

import (
	"argus-rpc/gen/template/v1"
	"argus-rpc/internal/core"
	"argus-rpc/internal/service/notifier"
	"context"
)

type NotifierHandler struct {
	v1.UnimplementedNotifierServiceServer
	service *notifier.Service
}

func NewNotifierHandler(service *notifier.Service) *NotifierHandler {
	return &NotifierHandler{service: service}
}

func (h *NotifierHandler) Dispatch(ctx context.Context, req *v1.NotificationRequest) (*v1.NotificationResponse, error) {
	// Map proto request to core.NotificationRequest
	coreReq := core.NotificationRequest{
		OrderID:     req.OrderId,
		Channel:     req.Channel,
		Recipient:   req.Recipient,
		TemplateKey: req.GetTemplateKey(),
		Locale:      req.GetLocale(),
		Subject:     req.GetSubject(),
		Body:        req.GetBody(),
	}

	if req.Variables != nil {
		coreReq.Variables = req.Variables.AsMap()
	}

	if err := h.service.Send(ctx, coreReq); err != nil {
		return &v1.NotificationResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &v1.NotificationResponse{
		Success: true,
		Message: "Notification queued",
	}, nil
}

func (h *NotifierHandler) BatchDispatch(ctx context.Context, req *v1.BatchNotificationRequest) (*v1.BatchNotificationResponse, error) {
	processed := 0
	failures := 0
	var errors []string

	for _, r := range req.Requests {
		_, err := h.Dispatch(ctx, r)
		if err != nil {
			failures++
			errors = append(errors, err.Error())
		} else {
			processed++
		}
	}

	return &v1.BatchNotificationResponse{
		ProcessedCount: int32(processed),
		FailureCount:   int32(failures),
		Errors:         errors,
	}, nil
}

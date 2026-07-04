package grpc

import (
	"context"
	v1 "gwa-rpc/gen/template/v1"
)

type DocumentHandler struct {
	v1.UnimplementedDocumentServiceServer
}

func NewDocumentHandler() *DocumentHandler {
	return &DocumentHandler{}
}

func (h *DocumentHandler) Generate(ctx context.Context, req *v1.GenerateDocumentRequest) (*v1.GenerateDocumentResponse, error) {
	return &v1.GenerateDocumentResponse{
		JobId:  "stub-job-id",
		Status: "pending",
	}, nil
}

func (h *DocumentHandler) GetStatus(ctx context.Context, req *v1.GetDocumentStatusRequest) (*v1.GetDocumentStatusResponse, error) {
	return &v1.GetDocumentStatusResponse{
		JobId:  req.JobId,
		Status: "completed",
	}, nil
}

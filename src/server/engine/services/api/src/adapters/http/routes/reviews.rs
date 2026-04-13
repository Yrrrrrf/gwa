use crate::adapters::http::app_state::AppState;
use crate::application::use_cases::auth::Claims;
use crate::application::{AppError, AppResult};
use axum::{
    Extension, Json, Router,
    extract::{Path, State},
    routing::{get, post},
};
use chrono::Utc;
use domain::entities::review::Review;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub fn r() -> Router<AppState> {
    Router::new()
        .route("/{business_id}", get(list_for_business))
        .route("/", post(create))
}

#[derive(Deserialize)]
pub struct CreateReviewRequest {
    pub business_id: String,
    pub rating: i32,
    pub body: Option<String>,
    pub locale: String,
}

#[derive(Serialize)]
pub struct CreateReviewResponse {
    pub status: String,
}

async fn list_for_business(
    State(state): State<AppState>,
    Path(business_id): Path<String>,
) -> AppResult<Json<Vec<Review>>> {
    let full_id = if business_id.contains(':') {
        business_id
    } else {
        format!("business:{}", business_id)
    };

    let reviews = state.review_repo.find_by_business(&full_id).await?;
    Ok(Json(reviews))
}

async fn create(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateReviewRequest>,
) -> AppResult<Json<CreateReviewResponse>> {
    if payload.rating < 1 || payload.rating > 5 {
        return Err(AppError::Validation(
            "Rating must be between 1 and 5".into(),
        ));
    }

    let review = Review {
        id: format!("review:{}", Uuid::new_v4()),
        user: claims.sub,
        business: payload.business_id,
        rating: payload.rating,
        body: payload.body,
        locale: payload.locale,
        created_at: Utc::now(),
    };

    state.review_repo.create(review).await?;

    Ok(Json(CreateReviewResponse {
        status: "created".into(),
    }))
}

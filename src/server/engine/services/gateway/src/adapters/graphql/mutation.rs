use crate::adapters::graphql::guards::AuthGuard;
use crate::adapters::graphql::types::auth::{AuthPayload, LoginInput, UserType};
use crate::adapters::graphql::types::item::{CreateItemInput, ItemType};
use crate::adapters::graphql::types::comment::{AddCommentInput, CommentType};
use crate::adapters::http::app_state::AppState;
use application::use_cases::auth::{LoginRequest, Claims, login as login_use_case};
use application::use_cases::items::{CreateItemRequest, AddCommentRequest, create_item, delete_item, add_comment, toggle_like};
use async_graphql::{Context, Object, Result};

pub struct Mutation;

#[Object]
impl Mutation {
    async fn login(&self, ctx: &Context<'_>, input: LoginInput) -> Result<AuthPayload> {
        let state = ctx.data::<AppState>()?;
        let payload = LoginRequest {
            email: input.email,
            password: input.password,
        };
        let response = login_use_case(&*state.auth_repo, &state.jwt_secret, payload).await?;

        Ok(AuthPayload {
            token: response.token,
            user: UserType::from(response.user),
        })
    }

    #[graphql(guard = "AuthGuard")]
    async fn create_item(&self, ctx: &Context<'_>, input: CreateItemInput) -> Result<ItemType> {
        let state = ctx.data::<AppState>()?;
        let request = CreateItemRequest {
            title: input.title,
            description: input.description,
            status: input.status,
            tags: input.tags,
            coordinates: input.coordinates.map(Into::into),
        };
        let item = create_item(&*state.item_repo, request).await?;
        Ok(ItemType::from(item))
    }

    #[graphql(guard = "AuthGuard")]
    async fn delete_item(&self, ctx: &Context<'_>, id: String) -> Result<bool> {
        let state = ctx.data::<AppState>()?;
        delete_item(&*state.item_repo, &id).await?;
        Ok(true)
    }

    #[graphql(guard = "AuthGuard")]
    async fn add_comment(&self, ctx: &Context<'_>, input: AddCommentInput) -> Result<CommentType> {
        let state = ctx.data::<AppState>()?;
        let claims = ctx.data::<Claims>()?;
        let request = AddCommentRequest {
            item_id: input.item_id,
            rating: input.rating,
            body: input.body,
        };
        let comment = add_comment(&*state.item_repo, &claims.sub, request).await?;
        Ok(CommentType::from(comment))
    }

    #[graphql(guard = "AuthGuard")]
    async fn toggle_like(&self, ctx: &Context<'_>, item_id: String) -> Result<bool> {
        let state = ctx.data::<AppState>()?;
        let claims = ctx.data::<Claims>()?;
        toggle_like(&*state.item_repo, &claims.sub, &item_id).await?;
        Ok(true)
    }
}

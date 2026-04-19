use super::comment::CommentType;
use crate::adapters::http::app_state::AppState;
use application::use_cases::items::list_comments;
use async_graphql::{ComplexObject, Context, Enum, InputObject, SimpleObject};
use domain::entities::item::{Coordinates, Item, ItemAction, ItemEvent};

#[derive(SimpleObject)]
pub struct CoordinatesType {
    pub lat: f64,
    pub lng: f64,
}

impl From<Coordinates> for CoordinatesType {
    fn from(c: Coordinates) -> Self {
        Self {
            lat: c.lat,
            lng: c.lng,
        }
    }
}

#[derive(InputObject)]
pub struct CoordinatesInput {
    pub lat: f64,
    pub lng: f64,
}

impl From<CoordinatesInput> for Coordinates {
    fn from(c: CoordinatesInput) -> Self {
        Self {
            lat: c.lat,
            lng: c.lng,
        }
    }
}

#[derive(SimpleObject)]
#[graphql(complex)]
pub struct ItemType {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub tags: Vec<String>,
    pub coordinates: Option<CoordinatesType>,
    pub rating: Option<f64>,
    pub comment_count: Option<i64>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<Item> for ItemType {
    fn from(item: Item) -> Self {
        Self {
            id: item.id,
            title: item.title,
            description: item.description,
            status: item.status,
            tags: item.tags,
            coordinates: item.coordinates.map(Into::into),
            rating: item.rating,
            comment_count: item.comment_count,
            created_at: item.created_at,
            updated_at: item.updated_at,
        }
    }
}

#[ComplexObject]
impl ItemType {
    async fn is_active(&self) -> bool {
        self.status == "active"
    }

    async fn comments(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<CommentType>> {
        let state = ctx.data::<AppState>()?;
        let comments = list_comments(state.item_repo.as_ref(), &self.id).await?;
        Ok(comments.into_iter().map(Into::into).collect())
    }
}

#[derive(InputObject)]
pub struct CreateItemInput {
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub tags: Option<Vec<String>>,
    pub coordinates: Option<CoordinatesInput>,
}

#[derive(Enum, Copy, Clone, Eq, PartialEq)]
pub enum ItemActionType {
    Create,
    Update,
    Delete,
}

impl From<ItemAction> for ItemActionType {
    fn from(action: ItemAction) -> Self {
        match action {
            ItemAction::Create => Self::Create,
            ItemAction::Update => Self::Update,
            ItemAction::Delete => Self::Delete,
        }
    }
}

#[derive(SimpleObject)]
pub struct ItemEventType {
    pub action: ItemActionType,
    pub item: ItemType,
}

impl From<ItemEvent> for ItemEventType {
    fn from(event: ItemEvent) -> Self {
        Self {
            action: ItemActionType::from(event.action),
            item: ItemType::from(event.item),
        }
    }
}

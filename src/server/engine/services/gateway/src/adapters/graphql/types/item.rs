use async_graphql::{ComplexObject, Enum, InputObject, SimpleObject};
use domain::entities::item::{Item, ItemAction, ItemEvent};

#[derive(SimpleObject)]
#[graphql(complex)]
pub struct ItemType {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
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
}

#[derive(InputObject)]
pub struct CreateItemInput {
    pub title: String,
    pub description: Option<String>,
    pub status: String,
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

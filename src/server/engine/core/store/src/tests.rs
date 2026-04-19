#[cfg(test)]
mod tests {
    use crate::client::SurrealClient;
    use crate::repos::item::SurrealItemRepo;
    use chrono::Utc;
    use domain::entities::item::Item;
    use domain::ports::item::ItemRepository;
    use std::sync::Arc;
    use surrealdb::engine::any::connect;
    use surrealdb::opt::auth::Root;

    async fn test_client() -> SurrealClient {
        let db = connect("ws://localhost:8000").await.unwrap();
        db.signin(Root {
            username: std::env::var("SURREAL_USER").unwrap_or("root".into()),
            password: std::env::var("SURREAL_PASS").unwrap_or("root".into()),
        })
        .await
        .unwrap();
        db.use_ns("app").use_db("main").await.unwrap();
        SurrealClient::new(Arc::new(db))
    }

    #[tokio::test]
    async fn item_crud_cycle() {
        let client = test_client().await;
        let repo = SurrealItemRepo::new(client);

        let item = Item {
            id: "".into(),
            title: "Rust Test Item".into(),
            description: Some("Created from Rust test".into()),
            status: "active".into(),
            tags: vec![],
            coordinates: None,
            rating: None,
            comment_count: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        // Create
        let created = repo.create(item).await.unwrap();
        assert_eq!(created.title, "Rust Test Item");
        let id = created.id;

        // Find
        let found = repo.find_by_id(&id).await.unwrap().unwrap();
        assert_eq!(found.title, "Rust Test Item");

        // List
        let list = repo.list().await.unwrap();
        assert!(list.iter().any(|i| i.id == id));

        // Delete
        repo.delete(&id).await.unwrap();
        let deleted = repo.find_by_id(&id).await.unwrap();
        assert!(deleted.is_none());
    }
}

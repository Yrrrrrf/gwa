#[cfg(test)]
mod tests {
    use crate::client::SurrealClient;
    use crate::repos::business::SurrealBusinessRepo;
    use crate::repos::review::SurrealReviewRepo;
    use chrono::Utc;
    use domain::entities::business::Point;
    use domain::entities::review::Review;
    use domain::ports::business::BusinessRepository;
    use domain::ports::review::ReviewRepository;
    use std::sync::Arc;
    use surrealdb::engine::any::connect;
    use surrealdb::opt::auth::Root;
    use surrealdb_types::Value;
    use uuid::Uuid;

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

    // --- GROUP A: Schema Integrity ---

    #[tokio::test]
    async fn a1_invalid_email_rejected() {
        let client = test_client().await;
        let res = client.db.query("CREATE user SET email='not-an-email', username='rust_bad', password_hash='x', role='tourist', locale='en'").await;
        assert!(res.is_err() || res.unwrap().check().is_err());
    }

    #[tokio::test]
    async fn a2_invalid_role_rejected() {
        let client = test_client().await;
        let res = client.db.query("CREATE user SET email='rust@x.com', username='rust_badrole', password_hash='x', role='hacker', locale='en'").await;
        assert!(res.is_err() || res.unwrap().check().is_err());
    }

    #[tokio::test]
    async fn a3_negative_rating_rejected() {
        let client = test_client().await;
        let res = client.db.query("RELATE user:tourist_akiko->review->business:hostal_mundo_libre SET rating=-1, locale='ja'").await;
        assert!(res.is_err() || res.unwrap().check().is_err());
    }

    #[tokio::test]
    async fn a4_invalid_price_range_rejected() {
        let client = test_client().await;
        let res = client.db.query("CREATE business SET name='Rust Bad Price', slug='rust-bad-price', category=category:gastronomy, city=city:cdmx, coordinates={type:'Point',coordinates:[0,0]}, price_range='$$$$', languages_spoken=['es']").await;
        assert!(res.is_err() || res.unwrap().check().is_err());
    }

    #[tokio::test]
    async fn a5_unsupported_locale_rejected() {
        let client = test_client().await;
        let res = client.db.query("CREATE business SET name='Rust Bad Locale', slug='rust-bad-locale', category=category:gastronomy, city=city:cdmx, coordinates={type:'Point',coordinates:[0,0]}, price_range='$', languages_spoken=['xx']").await;
        assert!(res.is_err() || res.unwrap().check().is_err());
    }

    // --- GROUP B: Unique Indexes ---

    #[tokio::test]
    async fn b1_duplicate_email_rejected() {
        let client = test_client().await;
        let res = client.db.query("CREATE user SET email='admin@xibalba.mx', username='rust_dupe', password_hash='x', role='admin', locale='es'").await;
        assert!(res.is_err() || res.unwrap().check().is_err());
    }

    #[tokio::test]
    async fn b2_duplicate_slug_rejected() {
        let client = test_client().await;
        let res = client.db.query("CREATE business SET name='Rust Dupe', slug='tacos-el-memo', category=category:gastronomy, city=city:cdmx, coordinates={type:'Point',coordinates:[0,0]}, price_range='$', languages_spoken=['es']").await;
        assert!(res.is_err() || res.unwrap().check().is_err());
    }

    // --- GROUP C: Computed Fields ---

    #[tokio::test]
    async fn c1_business_rating_computed_correctly() {
        let client = test_client().await;
        let repo = SurrealBusinessRepo::new(client);
        let biz = repo
            .find_by_id("business:mezcaleria_la_condesa")
            .await
            .unwrap()
            .unwrap();
        assert!(biz.rating.unwrap() >= 4.0);
    }

    #[tokio::test]
    async fn c2_review_count_correct() {
        let client = test_client().await;
        let repo = SurrealBusinessRepo::new(client);
        let biz = repo
            .find_by_id("business:tacos_el_memo")
            .await
            .unwrap()
            .unwrap();
        assert!(biz.review_count >= 1);
    }

    #[tokio::test]
    async fn c3_category_path_hierarchy() {
        let client = test_client().await;
        let mut res = client
            .db
            .query("SELECT path FROM category:gastronomy")
            .await
            .unwrap();
        let path: Option<String> = res.take("path").unwrap();
        assert_eq!(path.unwrap(), "Gastronomía");
    }

    #[tokio::test]
    async fn c4_rating_recomputed_after_review() {
        let client = test_client().await;

        // Pre-cleanup: ensure no previous test run left a review
        let _ = client
            .db
            .query(
                "DELETE review WHERE in = user:tourist_james AND out = business:cantina_la_perla",
            )
            .await;

        let biz_repo = SurrealBusinessRepo::new(client.clone());
        let rev_repo = SurrealReviewRepo::new(client.clone());

        let biz_id = "business:cantina_la_perla";
        let biz_before = biz_repo.find_by_id(biz_id).await.unwrap().unwrap();

        let review = Review {
            id: format!("review:{}", Uuid::new_v4()),
            user: "user:tourist_james".to_string(),
            business: biz_id.to_string(),
            rating: 5,
            body: Some("Rust Test Review".into()),
            locale: "en".into(),
            created_at: Utc::now(),
        };

        rev_repo.create(review).await.unwrap();

        let biz_after = biz_repo.find_by_id(biz_id).await.unwrap().unwrap();
        assert!(biz_after.review_count > biz_before.review_count);

        // Cleanup: remove the test review so the DB returns to seed state
        client
            .db
            .query("DELETE review WHERE in = type::record($user) AND out = type::record($business)")
            .bind(("user", "user:tourist_james"))
            .bind(("business", biz_id))
            .await
            .unwrap()
            .check()
            .unwrap();
    }

    // --- GROUP D: Events ---

    #[tokio::test]
    async fn d1_on_review_created_produces_activity() {
        let client = test_client().await;
        let mut res = client
            .db
            .query("SELECT type FROM activity WHERE type = 'review.received'")
            .await
            .unwrap();
        let types: Vec<String> = res.take("type").unwrap();
        assert!(!types.is_empty());
    }

    #[tokio::test]
    async fn d2_first_review_milestone() {
        let client = test_client().await;
        let mut res = client
            .db
            .query("SELECT type FROM activity WHERE type = 'review.first'")
            .await
            .unwrap();
        let types: Vec<String> = res.take("type").unwrap();
        assert!(!types.is_empty());
    }

    #[tokio::test]
    async fn d3_on_business_verified_produces_activity() {
        let client = test_client().await;
        let mut res = client
            .db
            .query("SELECT type FROM activity WHERE type = 'business.verified'")
            .await
            .unwrap();
        let types: Vec<String> = res.take("type").unwrap();
        assert!(!types.is_empty());
    }

    // --- GROUP E: Graph Traversals ---

    #[tokio::test]
    async fn e1_forward_traversal_owner_manages_business() {
        let client = test_client().await;
        let mut res = client
            .db
            .query("SELECT ->manages->business.name as names FROM user:owner_carlos")
            .await
            .unwrap();
        let names: Vec<Vec<String>> = res.take("names").unwrap();
        assert!(names[0].contains(&"Taquería El Memo (Tacos)".to_string()));
    }

    #[tokio::test]
    async fn e2_reverse_traversal_business_managed_by_user() {
        let client = test_client().await;
        let mut res = client
            .db
            .query("SELECT <-manages<-user.username as usernames FROM business:tacos_el_memo")
            .await
            .unwrap();
        let usernames: Vec<Vec<String>> = res.take("usernames").unwrap();
        assert!(usernames[0].contains(&"owner_carlos".to_string()));
    }

    #[tokio::test]
    async fn e3_visits_relation() {
        let client = test_client().await;
        let mut res = client
            .db
            .query("SELECT ->visits->business.name as names FROM user:tourist_akiko")
            .await
            .unwrap();
        let names: Vec<Vec<String>> = res.take("names").unwrap();
        assert!(names[0].contains(&"Artesanías Xochimilco".to_string()));
    }

    #[tokio::test]
    async fn e4_favorites_relation() {
        let client = test_client().await;
        let mut res = client
            .db
            .query("SELECT ->favorites->business.name as names FROM user:tourist_james")
            .await
            .unwrap();
        let names: Vec<Vec<String>> = res.take("names").unwrap();
        assert!(names[0].contains(&"Taquería El Memo (Tacos)".to_string()));
    }

    #[tokio::test]
    async fn e5_recommendation_engine() {
        let client = test_client().await;
        let repo = SurrealBusinessRepo::new(client);
        let recommendations = repo
            .get_recommendations("user:tourist_akiko", 5)
            .await
            .unwrap();
        assert!(!recommendations.is_empty());
    }

    // --- GROUP F: Full-Text Search ---

    #[tokio::test]
    async fn f1_fts_on_name_tacos() {
        let client = test_client().await;
        let repo = SurrealBusinessRepo::new(client);
        let businesses = repo.search("Tacos", "en", None, None).await.unwrap();
        assert!(
            businesses
                .iter()
                .any(|b| b.name.contains("Taquería El Memo"))
        );
    }

    #[tokio::test]
    async fn f2_fts_with_ascii_normalization() {
        let client = test_client().await;
        let repo = SurrealBusinessRepo::new(client);
        let businesses = repo.search("artesanias", "en", None, None).await.unwrap();
        assert!(businesses.iter().any(|b| b.name.contains("Artesanías")));
    }

    // --- GROUP G: Reference Integrity ---

    #[tokio::test]
    async fn g1_cannot_delete_referenced_city() {
        let client = test_client().await;
        let res = client.db.query("DELETE city:cdmx").await;
        assert!(res.is_err() || res.unwrap().check().is_err());
    }

    // --- GROUP H: Seed Verification ---

    #[tokio::test]
    async fn h1_user_count() {
        let client = test_client().await;
        let mut res = client
            .db
            .query("SELECT count() FROM user GROUP ALL")
            .await
            .unwrap();
        let counts: Vec<Value> = res.take(0).unwrap();
        let count = counts
            .first()
            .map(|v| v.clone().into_json_value())
            .and_then(|j| j.get("count").and_then(|c| c.as_i64()))
            .unwrap_or(0);
        assert!(count >= 8);
    }

    #[tokio::test]
    async fn h2_business_count() {
        let client = test_client().await;
        let mut res = client
            .db
            .query("SELECT count() FROM business GROUP ALL")
            .await
            .unwrap();
        let counts: Vec<Value> = res.take(0).unwrap();
        let count = counts
            .first()
            .map(|v| v.clone().into_json_value())
            .and_then(|j| j.get("count").and_then(|c| c.as_i64()))
            .unwrap_or(0);
        assert!(count >= 8);
    }

    #[tokio::test]
    async fn h3_review_count() {
        let client = test_client().await;
        let mut res = client
            .db
            .query("SELECT count() FROM review GROUP ALL")
            .await
            .unwrap();
        let counts: Vec<Value> = res.take(0).unwrap();
        let count = counts
            .first()
            .map(|v| v.clone().into_json_value())
            .and_then(|j| j.get("count").and_then(|c| c.as_i64()))
            .unwrap_or(0);
        assert!(count >= 9);
    }

    // --- GROUP I: Geo Search ---

    #[tokio::test]
    async fn i1_businesses_near_cdmx() {
        let client = test_client().await;
        let repo = SurrealBusinessRepo::new(client);
        let point = Point::new(-99.1332, 19.4326);
        let businesses = repo.find_near(point, 10.0).await.unwrap();
        assert!(!businesses.is_empty());
    }

    #[tokio::test]
    async fn i2_no_businesses_near_tokyo() {
        let client = test_client().await;
        let repo = SurrealBusinessRepo::new(client);
        let point = Point::new(139.6503, 35.6762);
        let businesses = repo.find_near(point, 10.0).await.unwrap();
        assert!(businesses.is_empty());
    }
}

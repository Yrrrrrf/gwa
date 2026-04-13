pub mod guards;
pub mod loaders;
pub mod mutation;
pub mod query;
pub mod subscription;
pub mod types;

use crate::adapters::graphql::mutation::Mutation;
use crate::adapters::graphql::query::Query;
use crate::adapters::graphql::subscription::Subscription;
use async_graphql::Schema;

pub type AppSchema = Schema<Query, Mutation, Subscription>;

pub fn build_schema() -> AppSchema {
    Schema::build(Query, Mutation, Subscription)
        .limit_depth(10)
        .limit_complexity(100)
        .finish()
}

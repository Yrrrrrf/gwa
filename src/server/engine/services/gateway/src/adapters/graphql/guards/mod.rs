use application::use_cases::auth::Claims;
use async_graphql::{Context, Guard, Result};

pub struct AuthGuard;

impl Guard for AuthGuard {
    async fn check(&self, ctx: &Context<'_>) -> Result<()> {
        if ctx.data_opt::<Claims>().is_none() {
            return Err("Unauthorized".into());
        }
        Ok(())
    }
}

pub struct AdminGuard;

impl Guard for AdminGuard {
    async fn check(&self, ctx: &Context<'_>) -> Result<()> {
        if let Some(claims) = ctx.data_opt::<Claims>()
            && claims.role == "admin" {
                return Ok(());
            }
        Err("Admin role required".into())
    }
}

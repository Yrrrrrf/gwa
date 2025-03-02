import os

from fastapi import FastAPI

from prism import *

app = FastAPI()

db = os.getenv("DB_NAME", "gwa")
user = os.getenv("DB_OWNER_ADMIN", "gwa_owner")
password = os.getenv("DB_OWNER_PWORD", "password")
host = os.getenv("DB_HOST", "localhost.docker.internal")

# Database connection setup
db_client = DbClient(
    config=DbConfig(
        db_type=os.getenv("DB_TYPE", "postgresql"),
        driver_type=os.getenv("DRIVER_TYPE", "sync"),
        # * these values will be read from the environment variables!
        # So, the current values are just defaults in case the environment variables are not set
        database=db, user=user, password=password, host=host, port=int(os.getenv("DB_PORT", 5432)),
        echo=False,
        pool_config=PoolConfig(
            pool_size=5, max_overflow=10, pool_timeout=30, pool_pre_ping=True
        ),
    )
)
db_client.test_connection()
db_client.log_metadata_stats()

# Create the model manager to organize database objects
model_manager = ModelManager(
    db_client=db_client,
    include_schemas=[
        "public",
        "account",
        "auth",
    ],
)

# Display database statistics
model_manager.log_metadata_stats()

# Initialize API generator
api_prism = ApiPrism(
    config=PrismConfig(
        project_name=f"{db_client.config.database}Hub",
        version="0.1.0",
    ),
    app=app,
)

# Generate metadata routes
api_prism.gen_metadata_routes(model_manager)
api_prism.gen_health_routes(model_manager)
api_prism.gen_table_routes(model_manager)
api_prism.gen_view_routes(model_manager)
api_prism.gen_fn_routes(model_manager)

api_prism.print_welcome(db_client)
print()

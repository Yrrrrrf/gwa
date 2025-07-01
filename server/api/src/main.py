import os

from fastapi import FastAPI

from prism import *

app = FastAPI()

# * read directly from the environment variables
# todo: Check if these environment variables are set before using them
# todo: Check where does this values are get from!
# todo: * Handle a way to manage the {{ placeholders }} from cargo-generate!
# todo: * Handle a way to manage the {{ placeholders }} from cargo-generate!
# todo: * Handle a way to manage the {{ placeholders }} from cargo-generate!
db = os.getenv("DB_NAME")
user = os.getenv("DB_OWNER_ADMIN")
password = os.getenv("DB_OWNER_PWORD")
host = os.getenv("DB_HOST")

# Database connection setup
db_client = DbClient(
    config=DbConfig(
        db_type=os.getenv("DB_TYPE", "postgresql"),
        driver_type=os.getenv("DRIVER_TYPE", "sync"),
        # * these values will be read from the environment variables!
        # So, the current values are just defaults in case the environment variables are not set
        database=db,
        user=user,
        password=password,
        host=host,
        port=int(os.getenv("DB_PORT", 5432)),
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
        project_name=f"{db_client.config.database.upper()} Hub",
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

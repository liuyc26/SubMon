import logging

from sqlmodel import SQLModel, create_engine
from app.config import DB_NAME

logger = logging.getLogger(__name__)

# Create an engine
sqlite_file_name = DB_NAME
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

# Create the tables
def create_db_and_tables():
    logger.info("create db and tables")
    SQLModel.metadata.create_all(engine)

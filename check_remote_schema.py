import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    DB_URL = "postgresql://orbe_admin:orbe_password@db:5432/orbesystems"

# Note: We need the actual remote DB_URL. Let me get it from EC2 using boto3!

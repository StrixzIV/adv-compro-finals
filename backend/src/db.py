from databases import Database
from lib.environ import env_single_use

def init_db ():
   POSTGRES_USER = env_single_use('POSTGRES_USER')
   POSTGRES_PASSWORD = env_single_use('POSTGRES_PASSWORD')
   POSTGRES_DB = env_single_use('POSTGRES_DB')
   POSTGRES_HOST = env_single_use('POSTGRES_HOST')

   DATABASE_URL = f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}/{POSTGRES_DB}"

   return Database(DATABASE_URL)

database = init_db()

async def connect_db():
   await database.connect()
   print("Database connected")


async def disconnect_db():
   await database.disconnect()
   print("Database disconnected")

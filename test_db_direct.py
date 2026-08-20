import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://orbe_admin:orbe_password@db:5432/orbesystems')
    print('DB OK')
    await conn.close()

asyncio.run(test())
import sys
import traceback
import asyncio

async def test_wrapper():
    try:
        from test_b2b2c_webhook import run_simulation
        await run_simulation()
    except Exception as e:
        with open("error_trace.txt", "w", encoding="utf-8") as f:
            traceback.print_exc(file=f)
        print("Caught exception! Written to error_trace.txt")

if __name__ == "__main__":
    asyncio.run(test_wrapper())

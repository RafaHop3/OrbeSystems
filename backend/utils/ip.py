from fastapi import Request

def safe_get_remote_address(request: Request) -> str:
    """
    Extrator de IP seguro para ambientes Serverless (Vercel).
    Evita travamentos (Erro 500) do SlowAPI quando request.client.host for None.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and getattr(request.client, "host", None):
        return request.client.host
    return "127.0.0.1"

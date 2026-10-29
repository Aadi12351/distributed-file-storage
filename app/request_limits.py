from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from app.config.settings import settings


class RequestLimits:
    """Bound both declared and streamed request bodies before route parsing."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        multipart = headers.get(b"content-type", b"").startswith(b"multipart/form-data")
        limit = (settings.MAX_UPLOAD_MB + 1) * 1024 * 1024 if multipart else 64 * 1024
        if scope.get("path") == "/account/avatar": limit = 3 * 1024 * 1024
        declared = headers.get(b"content-length", b"")
        if declared.isdigit() and int(declared) > limit:
            response = JSONResponse({"detail": "Request exceeds the size limit"}, status_code=413)
            return await response(scope, receive, send)
        received = 0
        async def bounded_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise HTTPException(413, "Request exceeds the size limit")
            return message
        await self.app(scope, bounded_receive, send)

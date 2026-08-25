"""
Minimal fixed-window per-IP rate limiting.

Limits are enforced per API instance (in-memory counters). For a single
container deployment this is exactly what you want; if you scale to multiple
replicas, either move counters into a shared store (Redis) or enforce limits
at your edge/load balancer instead of here.
"""

import threading
import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

_PRUNE_THRESHOLD = 10_000  # stop tracking IPs beyond this many live windows


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        default_limit_per_minute: int = 120,
        upload_limit_per_minute: int = 10,
        window_seconds: int = 60,
    ) -> None:
        super().__init__(app)
        self.default_limit = default_limit_per_minute
        self.upload_limit = upload_limit_per_minute
        self.window_seconds = window_seconds
        # (client_ip, bucket) -> [window_started_at, hits_in_window]
        self._hits: dict[tuple[str, str], list[float]] = defaultdict(lambda: [0.0, 0])
        self._lock = threading.Lock()

    @staticmethod
    def _bucket_for(request: Request) -> str:
        """Uploads are the expensive/abusable path, so they get their own bucket."""
        if request.method == "POST" and request.url.path.rstrip("/") == "/transactions/import":
            return "upload"
        return "default"

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        bucket = self._bucket_for(request)
        now = time.monotonic()

        with self._lock:
            if len(self._hits) > _PRUNE_THRESHOLD:
                self._prune(now)
            window = self._hits[(client_ip, bucket)]
            if now - window[0] >= self.window_seconds:
                window[0] = now
                window[1] = 0
            window[1] += 1
            allowed = window[1] <= self.limit_for(bucket)

        if not allowed:
            retry_after = max(1, int(self.window_seconds - (now - window[0])))
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": str(retry_after)},
            )
        return await call_next(request)

    def limit_for(self, bucket: str) -> int:
        return self.upload_limit if bucket == "upload" else self.default_limit

    def _prune(self, now: float) -> None:
        expired = [
            key
            for key, window in self._hits.items()
            if now - window[0] >= self.window_seconds
        ]
        for key in expired:
            del self._hits[key]

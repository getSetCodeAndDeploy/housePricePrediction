import time

import httpx


class ModelError(Exception):
    """Base class; carries the HTTP status we should return to our own caller."""

    status_code = 502

    def __init__(self, message: str, detail=None):
        super().__init__(message)
        self.message, self.detail = message, detail


class ModelUnavailable(ModelError):
    status_code = 503


class ModelRejected(ModelError):
    status_code = 422


class ModelClient:
    """Thin async client for the Task 1 model container."""

    def __init__(self, http: httpx.AsyncClient, info_ttl_s: float = 60):
        self.http = http
        self._info: dict | None = None
        self._info_at = 0.0
        self._ttl = info_ttl_s

    async def _request(self, method: str, path: str, **kw):
        try:
            r = await self.http.request(method, path, **kw)
        except httpx.TimeoutException as e:
            raise ModelUnavailable("Model service timed out") from e
        except httpx.TransportError as e:
            raise ModelUnavailable("Model service is unreachable") from e
        if r.status_code == 422:
            raise ModelRejected("Model service rejected the input", r.json().get("errors"))
        if r.status_code >= 400:
            raise ModelError(f"Model service error ({r.status_code})")
        return r.json()

    async def predict(self, rows: list[dict]) -> list[dict]:
        body = await self._request("POST", "/predict", json={"instances": rows})
        return body["predictions"]

    async def info(self) -> dict:
        """Cached: coefficients only change when the model is retrained."""
        if self._info is None or time.monotonic() - self._info_at > self._ttl:
            self._info = await self._request("GET", "/model-info")
            self._info_at = time.monotonic()
        return self._info

    async def health(self) -> dict:
        return await self._request("GET", "/health")

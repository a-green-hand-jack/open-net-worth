"""Binance transport tests use an in-memory server and synthetic credentials only."""

import hashlib
import hmac
from urllib.parse import parse_qs

import httpx
import pytest

from backend.core.errors import ConflictError, ExternalServiceError
from backend.services.trading import binance_rest


@pytest.fixture
def mock_transport(monkeypatch):
    client_type = httpx.AsyncClient
    captured = []
    state = {"status": 200, "body": b'{"uid":123}'}

    def handle(request):
        captured.append(request)
        return httpx.Response(state["status"], content=state["body"], request=request)

    def client(**kwargs):
        return client_type(transport=httpx.MockTransport(handle), **kwargs)

    monkeypatch.setattr(binance_rest.httpx, "AsyncClient", client)
    monkeypatch.setattr(binance_rest.time, "time", lambda: 1234.0)
    return captured, state


async def test_signed_request_uses_fixed_testnet_host_and_hmac(mock_transport):
    captured, _ = mock_transport
    transport = binance_rest.BinanceRest("testnet", "synthetic-key", "synthetic-secret")
    assert await transport("GET", "/api/v3/account", {}) == {"uid": 123}
    request = captured[0]
    assert request.url.host == "testnet.binance.vision"
    assert request.headers["X-MBX-APIKEY"] == "synthetic-key"
    query = request.url.query.decode()
    unsigned, signature = query.rsplit("&signature=", 1)
    expected = hmac.new(b"synthetic-secret", unsigned.encode(), hashlib.sha256).hexdigest()
    assert signature == expected
    assert parse_qs(unsigned) == {"recvWindow": ["5000"], "timestamp": ["1234000"]}


async def test_public_market_query_omits_authentication(mock_transport):
    captured, _ = mock_transport
    transport = binance_rest.BinanceRest("testnet", "synthetic-key", "synthetic-secret")
    await transport("GET", "/api/v3/exchangeInfo", {"symbol": "ACMEUSDT"})
    assert "X-MBX-APIKEY" not in captured[0].headers
    assert parse_qs(captured[0].url.query.decode()) == {"symbol": ["ACMEUSDT"]}


@pytest.mark.parametrize(
    "method,path,params",
    [
        ("POST", "/api/v3/withdraw", {}),
        ("GET", "/sapi/v1/account/apiRestrictions", {}),
        ("POST", "/api/v3/order", {"signature": "other"}),
        ("POST", "/api/v3/order", {"timestamp": 0}),
    ],
)
async def test_unapproved_endpoints_and_caller_auth_fields_never_dispatch(
    mock_transport, method, path, params
):
    captured, _ = mock_transport
    with pytest.raises(ConflictError):
        await binance_rest.BinanceRest("testnet", "synthetic-key", "synthetic-secret")(
            method, path, params
        )
    assert captured == []


@pytest.mark.parametrize(
    "status,body",
    [
        (302, b"{}"),
        (401, b"synthetic-private-error"),
        (200, b'{"code":-1}'),
        (200, b"x" * 2_000_001),
    ],
)
async def test_errors_redirects_and_oversized_responses_are_not_exposed(
    mock_transport, status, body
):
    _, state = mock_transport
    state.update(status=status, body=body)
    with pytest.raises(ExternalServiceError) as error:
        await binance_rest.BinanceRest("live", "synthetic-key", "synthetic-secret")(
            "GET", "/api/v3/account", {}
        )
    assert "synthetic-private-error" not in str(error.value)
    assert "synthetic-secret" not in str(error.value)

"""Safe localized metadata for connector application errors."""

from fastapi.responses import JSONResponse

from backend.core.errors import OpenNetWorthError, to_http_status


def connector_domain_error(exc: OpenNetWorthError) -> JSONResponse:
    body: dict[str, object] = {"detail": exc.message or str(exc)}
    if exc.context.get("message_id") in {
        "connector.error.unknown",
        "connector.error.mcpDuplicate",
        "connector.error.mcpUnknown",
        "connector.error.alwaysOn",
        "connector.error.fixedYahoo",
        "connector.error.fixedCoinGecko",
        "connector.error.plaidNotConfigured",
        "connector.error.plaidBankNotLinked",
        "connector.error.plaidNoLink",
        "connector.error.plaidNoLinkProgress",
        "connector.error.plaidPublicTokenRequired",
        "connector.error.plaidNoAccessToken",
        "connector.error.plaidBankNameLong",
        "connector.error.plaidRemoveFailed",
        "connector.error.plaidNotLinked",
        "connector.error.lunchFlowNotLinked",
        "connector.error.lunchFlowExpired",
        "connector.error.lunchFlowNoRefreshToken",
        "connector.error.enableCryptoRequired",
        "connector.error.enableInvalidPrivateKey",
        "connector.error.enablePrivateKeyRSA",
        "connector.error.enableNotConfigured",
        "connector.error.enableInvalidCountry",
        "connector.error.enableBankRequired",
        "connector.error.enableNoConsentURL",
        "connector.error.enableCodeRequired",
        "connector.error.enableNoSession",
        "connector.error.goCardlessNotConfigured",
        "connector.error.goCardlessInvalidCountry",
        "connector.error.goCardlessInvalidRedirect",
        "connector.error.goCardlessInvalidInstitution",
        "connector.error.goCardlessBankNotLinked",
        "connector.error.goCardlessNoBank",
        "connector.error.goCardlessRemoveFailed",
        "connector.error.goCardlessNoLinkedBank",
    }:
        body["message_id"] = exc.context["message_id"]
        body["message_params"] = exc.context.get("message_params", {})
    return JSONResponse(status_code=to_http_status(exc), content=body)

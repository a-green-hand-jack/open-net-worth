import { defineMessages } from 'react-intl'

// IDs are a public contract with the trading API. Unknown IDs retain the server message.
export const tradingServerMessages = defineMessages({
  'trading.error.book_projection_conflict': {
    id: 'trading.error.book_projection_conflict',
    defaultMessage: 'ConflictError',
  },
  'trading.error.live_adapter_unconfigured': {
    id: 'trading.error.live_adapter_unconfigured',
    defaultMessage: 'No verified live trading adapter is configured',
  },
  'trading.error.feed_historical': {
    id: 'trading.error.feed_historical',
    defaultMessage: 'Historical runs cannot access current market feeds',
  },
  'trading.error.feed_usd_only': {
    id: 'trading.error.feed_usd_only',
    defaultMessage: 'The Yahoo trading feed currently requires USD-quoted instruments',
  },
  'trading.error.quote_authority_missing': {
    id: 'trading.error.quote_authority_missing',
    defaultMessage:
      "This instrument has no verified current-source authority matching the latest quote's currency, time and price",
  },
  'trading.error.feed_no_usable_quotes': {
    id: 'trading.error.feed_no_usable_quotes',
    defaultMessage:
      'The current market source returned no usable quotes for subscribed instruments',
  },
  'trading.error.work_kind_unsupported': {
    id: 'trading.error.work_kind_unsupported',
    defaultMessage: 'Unsupported executor work event kind',
  },
  'trading.error.work_record_too_large': {
    id: 'trading.error.work_record_too_large',
    defaultMessage: 'A work record may contain at most 4 MiB; split larger records',
  },
  'trading.error.work_record_wrong_deployment': {
    id: 'trading.error.work_record_wrong_deployment',
    defaultMessage: 'Work record does not belong to this workspace deployment',
  },
  'trading.error.work_record_parts_invalid': {
    id: 'trading.error.work_record_parts_invalid',
    defaultMessage: 'Invalid work record parts',
  },
  'trading.error.workspace_filename_invalid': {
    id: 'trading.error.workspace_filename_invalid',
    defaultMessage: 'Use a relative workspace filename without traversal',
  },
  'trading.error.workspace_file_too_large': {
    id: 'trading.error.workspace_file_too_large',
    defaultMessage: 'Workspace file exceeds 64000 UTF-8 bytes',
  },
  'trading.error.workspace_file_version_limit': {
    id: 'trading.error.workspace_file_version_limit',
    defaultMessage: 'Workspace file version limit reached',
  },
  'trading.error.workspace_file_version_not_found': {
    id: 'trading.error.workspace_file_version_not_found',
    defaultMessage: 'Workspace file version not found',
  },
  'trading.error.reconciliation_broker_only': {
    id: 'trading.error.reconciliation_broker_only',
    defaultMessage: 'Only broker-executed runs use broker reconciliation',
  },
  'trading.error.reconciliation_mandate_not_started': {
    id: 'trading.error.reconciliation_mandate_not_started',
    defaultMessage: 'Start the live mandate before reconciling its executions',
  },
  'trading.error.reconciliation_order_wrong_account': {
    id: 'trading.error.reconciliation_order_wrong_account',
    defaultMessage: 'Broker returned an order outside this managed account',
  },
  'trading.error.account_already_managed': {
    id: 'trading.error.account_already_managed',
    defaultMessage: 'Broker account is already managed by another run',
  },
  'trading.error.account_outside_run': {
    id: 'trading.error.account_outside_run',
    defaultMessage: 'Account is outside the trading run',
  },
  'trading.error.activation_state_changed': {
    id: 'trading.error.activation_state_changed',
    defaultMessage: 'Run state changed during activation',
  },
  'trading.error.active_definition': {
    id: 'trading.error.active_definition',
    defaultMessage: 'Amend the workspace mandate instead of editing an active definition',
  },
  'trading.error.activity_kind': {
    id: 'trading.error.activity_kind',
    defaultMessage: 'Invalid trading activity kind',
  },
  'trading.error.allocation_fx_missing': {
    id: 'trading.error.allocation_fx_missing',
    defaultMessage: 'Missing allocation currency FX rate for {currency}',
  },
  'trading.error.allocation_mismatch': {
    id: 'trading.error.allocation_mismatch',
    defaultMessage: 'Broker account identity or currency does not match allocation',
  },
  'trading.error.alpaca_account_inactive': {
    id: 'trading.error.alpaca_account_inactive',
    defaultMessage: 'Alpaca account is not active for trading',
  },
  'trading.error.alpaca_account_mismatch': {
    id: 'trading.error.alpaca_account_mismatch',
    defaultMessage: 'Connected Alpaca account differs from the authorized account',
  },
  'trading.error.alpaca_account_requirements': {
    id: 'trading.error.alpaca_account_requirements',
    defaultMessage: 'Managed Alpaca execution requires an unleveraged USD cash account',
  },
  'trading.error.alpaca_amount_invalid': {
    id: 'trading.error.alpaca_amount_invalid',
    defaultMessage: 'Alpaca returned an invalid monetary value',
  },
  'trading.error.alpaca_cancel_identity': {
    id: 'trading.error.alpaca_cancel_identity',
    defaultMessage: 'Reconcile the order identity before cancellation',
  },
  'trading.error.alpaca_crypto_gtc': {
    id: 'trading.error.alpaca_crypto_gtc',
    defaultMessage: 'Alpaca crypto requires GTC in this trading contract',
  },
  'trading.error.alpaca_currency': {
    id: 'trading.error.alpaca_currency',
    defaultMessage: 'Alpaca adapter only supports USD-quoted instruments',
  },
  'trading.error.alpaca_fill_identity': {
    id: 'trading.error.alpaca_fill_identity',
    defaultMessage: 'Alpaca fill lacks execution identity or timestamp',
  },
  'trading.error.alpaca_history_incomplete': {
    id: 'trading.error.alpaca_history_incomplete',
    defaultMessage: 'Alpaca execution history is incomplete; reconciliation required',
  },
  'trading.error.alpaca_history_invalid': {
    id: 'trading.error.alpaca_history_invalid',
    defaultMessage: 'Alpaca execution history is not a list',
  },
  'trading.error.alpaca_history_limit': {
    id: 'trading.error.alpaca_history_limit',
    defaultMessage: 'Alpaca execution history exceeds the bounded reconciliation window',
  },
  'trading.error.alpaca_instrument_mismatch': {
    id: 'trading.error.alpaca_instrument_mismatch',
    defaultMessage: 'Alpaca returned an order for a different instrument',
  },
  'trading.error.alpaca_live_binding': {
    id: 'trading.error.alpaca_live_binding',
    defaultMessage: 'Alpaca transport is no longer explicitly bound to live execution',
  },
  'trading.error.alpaca_order_identity': {
    id: 'trading.error.alpaca_order_identity',
    defaultMessage: 'Alpaca order identity does not match the submitted intent',
  },
  'trading.error.alpaca_order_mismatch': {
    id: 'trading.error.alpaca_order_mismatch',
    defaultMessage: 'Alpaca returned an order with a different side or quantity',
  },
  'trading.error.alpaca_orders_invalid': {
    id: 'trading.error.alpaca_orders_invalid',
    defaultMessage: 'Alpaca open-order receipt is not a list',
  },
  'trading.error.alpaca_position_identity': {
    id: 'trading.error.alpaca_position_identity',
    defaultMessage: 'Alpaca position lacks an instrument identity',
  },
  'trading.error.alpaca_positions_invalid': {
    id: 'trading.error.alpaca_positions_invalid',
    defaultMessage: 'Alpaca positions receipt is not a list',
  },
  'trading.error.alpaca_receipt_invalid': {
    id: 'trading.error.alpaca_receipt_invalid',
    defaultMessage: 'Alpaca returned an invalid structured receipt',
  },
  'trading.error.alpaca_short_position': {
    id: 'trading.error.alpaca_short_position',
    defaultMessage: 'Managed Alpaca account contains a short position',
  },
  'trading.error.alpaca_state_reconciliation': {
    id: 'trading.error.alpaca_state_reconciliation',
    defaultMessage: 'Alpaca order state requires manual reconciliation',
  },
  'trading.error.amount_not_finite': {
    id: 'trading.error.amount_not_finite',
    defaultMessage: 'Amount must be finite',
  },
  'trading.error.asset_class_outside_mandate': {
    id: 'trading.error.asset_class_outside_mandate',
    defaultMessage: 'Asset class is outside the mandate',
  },
  'trading.error.backtest_clock': {
    id: 'trading.error.backtest_clock',
    defaultMessage: 'Backtest clock must move forward within the mandate',
  },
  'trading.error.backtest_dataset_required': {
    id: 'trading.error.backtest_dataset_required',
    defaultMessage: 'Backtests require a versioned observation dataset',
  },
  'trading.error.billing_reconciliation_required': {
    id: 'trading.error.billing_reconciliation_required',
    defaultMessage: 'Previous model usage requires billing reconciliation',
  },
  'trading.error.binance_account_requirements': {
    id: 'trading.error.binance_account_requirements',
    defaultMessage: 'Binance requires an active unleveraged Spot-only account',
  },
  'trading.error.binance_allocation_identity': {
    id: 'trading.error.binance_allocation_identity',
    defaultMessage: 'Binance account identity differs from the authorized allocation',
  },
  'trading.error.binance_allocation_mismatch': {
    id: 'trading.error.binance_allocation_mismatch',
    defaultMessage: 'Binance allocation must match the configured wallet, venue and quote currency',
  },
  'trading.error.binance_allocation_mixed': {
    id: 'trading.error.binance_allocation_mixed',
    defaultMessage:
      'Allocate the entire Binance wallet once; Testnet runs cannot mix execution sources',
  },
  'trading.error.binance_amount_invalid': {
    id: 'trading.error.binance_amount_invalid',
    defaultMessage: 'Binance returned an invalid monetary value',
  },
  'trading.error.binance_balance_identity': {
    id: 'trading.error.binance_balance_identity',
    defaultMessage: 'Binance balance has an invalid or repeated asset identity',
  },
  'trading.error.binance_cancel_identity': {
    id: 'trading.error.binance_cancel_identity',
    defaultMessage: 'Reconcile Binance order identity before cancellation',
  },
  'trading.error.binance_credentials_required': {
    id: 'trading.error.binance_credentials_required',
    defaultMessage: 'Binance requires an API key and HMAC API secret',
  },
  'trading.error.binance_disabled': {
    id: 'trading.error.binance_disabled',
    defaultMessage: 'Configure and enable Binance before allocating its wallet',
  },
  'trading.error.binance_endpoint_forbidden': {
    id: 'trading.error.binance_endpoint_forbidden',
    defaultMessage: 'Binance endpoint is outside the Spot execution contract',
  },
  'trading.error.binance_environment_invalid': {
    id: 'trading.error.binance_environment_invalid',
    defaultMessage: 'Binance environment must be live or testnet',
  },
  'trading.error.binance_environment_mismatch': {
    id: 'trading.error.binance_environment_mismatch',
    defaultMessage: 'Binance environment, venue or quote currency differs from allocation',
  },
  'trading.error.binance_gtc_only': {
    id: 'trading.error.binance_gtc_only',
    defaultMessage: 'Binance Spot execution supports GTC only',
  },
  'trading.error.binance_history_incomplete': {
    id: 'trading.error.binance_history_incomplete',
    defaultMessage: 'Binance execution history is incomplete; reconciliation required',
  },
  'trading.error.binance_history_limit': {
    id: 'trading.error.binance_history_limit',
    defaultMessage: 'Binance execution history exceeds the bounded reconciliation window',
  },
  'trading.error.binance_instrument_inactive': {
    id: 'trading.error.binance_instrument_inactive',
    defaultMessage: 'Binance instrument is not active Spot trading in the allocation currency',
  },
  'trading.error.binance_instrument_mismatch': {
    id: 'trading.error.binance_instrument_mismatch',
    defaultMessage: 'Binance instrument differs from the authorized allocation',
  },
  'trading.error.binance_instrument_not_unique': {
    id: 'trading.error.binance_instrument_not_unique',
    defaultMessage: 'Binance did not establish a unique Spot instrument',
  },
  'trading.error.binance_key_permissions': {
    id: 'trading.error.binance_key_permissions',
    defaultMessage:
      'Binance API key must allow Spot reads/trades and disable withdrawals, transfers and leverage',
  },
  'trading.error.binance_limit_mismatch': {
    id: 'trading.error.binance_limit_mismatch',
    defaultMessage: 'Binance limit price differs from the submitted intent',
  },
  'trading.error.binance_list_invalid': {
    id: 'trading.error.binance_list_invalid',
    defaultMessage: 'Binance returned an invalid list receipt',
  },
  'trading.error.binance_mode_mismatch': {
    id: 'trading.error.binance_mode_mismatch',
    defaultMessage: 'Binance Spot Testnet requires Paper; Binance real funds require Live',
  },
  'trading.error.binance_pair_required': {
    id: 'trading.error.binance_pair_required',
    defaultMessage: 'Binance requires an explicit BASE/QUOTE crypto instrument',
  },
  'trading.error.binance_receipt_invalid': {
    id: 'trading.error.binance_receipt_invalid',
    defaultMessage: 'Binance returned an invalid structured receipt',
  },
  'trading.error.binance_receipt_mismatch': {
    id: 'trading.error.binance_receipt_mismatch',
    defaultMessage: 'Binance order receipt differs from the immutable submitted intent',
  },
  'trading.error.binance_status_reconciliation': {
    id: 'trading.error.binance_status_reconciliation',
    defaultMessage: 'Binance order status requires manual reconciliation',
  },
  'trading.error.binance_testnet_book': {
    id: 'trading.error.binance_testnet_book',
    defaultMessage: 'Binance Spot Testnet executions cannot enter the real book',
  },
  'trading.error.binance_testnet_wallet': {
    id: 'trading.error.binance_testnet_wallet',
    defaultMessage: 'Binance Spot Testnet does not provide wallet endpoints',
  },
  'trading.error.binance_third_asset_fee': {
    id: 'trading.error.binance_third_asset_fee',
    defaultMessage: 'Binance third-asset commission requires explicit reconciliation',
  },
  'trading.error.binance_timestamp_invalid': {
    id: 'trading.error.binance_timestamp_invalid',
    defaultMessage: 'Binance execution timestamp is invalid',
  },
  'trading.error.binance_trade_identity': {
    id: 'trading.error.binance_trade_identity',
    defaultMessage: 'Binance returned an invalid or repeated execution identity',
  },
  'trading.error.binance_trade_mismatch': {
    id: 'trading.error.binance_trade_mismatch',
    defaultMessage: 'Binance trade side, price or quantity differs from the order',
  },
  'trading.error.binance_trade_outside_order': {
    id: 'trading.error.binance_trade_outside_order',
    defaultMessage: 'Binance returned a trade outside the requested order',
  },
  'trading.error.binance_wallet_identity': {
    id: 'trading.error.binance_wallet_identity',
    defaultMessage: 'Binance account identity differs from the configured wallet',
  },
  'trading.error.binance_whole_wallet': {
    id: 'trading.error.binance_whole_wallet',
    defaultMessage: 'Binance requires an exclusively allocated whole Spot wallet',
  },
  'trading.error.book_account_mismatch': {
    id: 'trading.error.book_account_mismatch',
    defaultMessage: 'Book account binding is missing, archived or has another currency',
  },
  'trading.error.book_cash_already_imported': {
    id: 'trading.error.book_cash_already_imported',
    defaultMessage: 'Execution cash is already imported; reconcile its lot before booking',
  },
  'trading.error.book_instrument_mapping': {
    id: 'trading.error.book_instrument_mapping',
    defaultMessage: 'Book instrument identity requires a unique existing instrument mapping',
  },
  'trading.error.book_position_missing': {
    id: 'trading.error.book_position_missing',
    defaultMessage: 'Sold instrument has no managed book position',
  },
  'trading.error.book_records_disagree': {
    id: 'trading.error.book_records_disagree',
    defaultMessage: 'Book fill and cash record disagree after restore',
  },
  'trading.error.broker_clock': {
    id: 'trading.error.broker_clock',
    defaultMessage: 'Broker clocks advance through broker reconciliation',
  },
  'trading.error.broker_identity_required': {
    id: 'trading.error.broker_identity_required',
    defaultMessage: 'Live account requires a broker identity and connector',
  },
  'trading.error.broker_receipt_invalid': {
    id: 'trading.error.broker_receipt_invalid',
    defaultMessage: 'Invalid broker order receipt',
  },
  'trading.error.cash_insufficient': {
    id: 'trading.error.cash_insufficient',
    defaultMessage: 'Insufficient unreserved account cash',
  },
  'trading.error.commissions_unknown': {
    id: 'trading.error.commissions_unknown',
    defaultMessage: 'Broker commissions are not yet known',
  },
  'trading.error.comparison_distinct': {
    id: 'trading.error.comparison_distinct',
    defaultMessage: 'A comparison needs distinct participant runs',
  },
  'trading.error.comparison_scenario': {
    id: 'trading.error.comparison_scenario',
    defaultMessage: 'Runs have different capital, data, execution mode or period',
  },
  'trading.error.dataset_immutable': {
    id: 'trading.error.dataset_immutable',
    defaultMessage: 'A backtest dataset is immutable',
  },
  'trading.error.day_calendar_required': {
    id: 'trading.error.day_calendar_required',
    defaultMessage: 'DAY requires a verified session calendar; this simulator supports GTC',
  },
  'trading.error.decision_cycle_busy': {
    id: 'trading.error.decision_cycle_busy',
    defaultMessage: 'Another decision cycle holds this run',
  },
  'trading.error.decision_invalid': {
    id: 'trading.error.decision_invalid',
    defaultMessage: 'Order decision must be a recorded decision in this workspace environment',
  },
  'trading.error.decision_lease_invalid': {
    id: 'trading.error.decision_lease_invalid',
    defaultMessage: 'Decision lease does not belong to this cycle',
  },
  'trading.error.duplicate_allocation': {
    id: 'trading.error.duplicate_allocation',
    defaultMessage: 'A broker account cannot be allocated twice in the same run',
  },
  'trading.error.duplicate_observation': {
    id: 'trading.error.duplicate_observation',
    defaultMessage: 'Dataset contains duplicate instrument observation timestamps',
  },
  'trading.error.environment_unresolved': {
    id: 'trading.error.environment_unresolved',
    defaultMessage:
      'Trading environment has an unresolved error; repair it before submitting new orders',
  },
  'trading.error.evidence_kind': {
    id: 'trading.error.evidence_kind',
    defaultMessage: 'Evidence kind must be order, fill or event',
  },
  'trading.error.evidence_not_found': {
    id: 'trading.error.evidence_not_found',
    defaultMessage: 'Trading evidence not found',
  },
  'trading.error.execution_isolation_unavailable': {
    id: 'trading.error.execution_isolation_unavailable',
    defaultMessage: 'Broker account cannot enforce isolated managed execution',
  },
  'trading.error.external_order': {
    id: 'trading.error.external_order',
    defaultMessage: 'Broker has an open order outside this managed mandate',
  },
  'trading.error.fee_asset_missing': {
    id: 'trading.error.fee_asset_missing',
    defaultMessage: 'Execution fee has no asset identity',
  },
  'trading.error.fee_consumes_quantity': {
    id: 'trading.error.fee_consumes_quantity',
    defaultMessage: 'Execution commission consumes the acquired quantity',
  },
  'trading.error.fee_correction_reconciliation': {
    id: 'trading.error.fee_correction_reconciliation',
    defaultMessage: 'Execution fee correction requires explicit reconciliation',
  },
  'trading.error.fee_instrument_invalid': {
    id: 'trading.error.fee_instrument_invalid',
    defaultMessage: 'Asset-denominated execution fees require a BASE/QUOTE crypto instrument',
  },
  'trading.error.fee_units_invalid': {
    id: 'trading.error.fee_units_invalid',
    defaultMessage: 'Invalid execution fee units',
  },
  'trading.error.fee_valuation_invalid': {
    id: 'trading.error.fee_valuation_invalid',
    defaultMessage: 'Unsupported commission asset or inconsistent execution fee valuation',
  },
  'trading.error.fill_cash_insufficient': {
    id: 'trading.error.fill_cash_insufficient',
    defaultMessage: 'Fill exceeds account cash; reconciliation required',
  },
  'trading.error.fill_correction_reconciliation': {
    id: 'trading.error.fill_correction_reconciliation',
    defaultMessage: 'Execution correction requires explicit reconciliation',
  },
  'trading.error.fill_identity_conflict': {
    id: 'trading.error.fill_identity_conflict',
    defaultMessage: 'Execution identity already belongs to another order',
  },
  'trading.error.fill_identity_missing': {
    id: 'trading.error.fill_identity_missing',
    defaultMessage: 'Broker fill needs a stable execution identity',
  },
  'trading.error.fill_order_mismatch': {
    id: 'trading.error.fill_order_mismatch',
    defaultMessage: 'Broker fill does not match the order instrument and side',
  },
  'trading.error.fill_predates_order': {
    id: 'trading.error.fill_predates_order',
    defaultMessage: 'Broker fill predates the order',
  },
  'trading.error.fill_quantity_insufficient': {
    id: 'trading.error.fill_quantity_insufficient',
    defaultMessage: 'Fill exceeds held quantity or proceeds',
  },
  'trading.error.fill_records_incomplete': {
    id: 'trading.error.fill_records_incomplete',
    defaultMessage: 'Broker reports filled without complete execution records',
  },
  'trading.error.fill_values_invalid': {
    id: 'trading.error.fill_values_invalid',
    defaultMessage: 'Invalid fill quantity, price or fee',
  },
  'trading.error.future_observation': {
    id: 'trading.error.future_observation',
    defaultMessage: 'Current market feeds cannot publish future observations',
  },
  'trading.error.grant_invalid': {
    id: 'trading.error.grant_invalid',
    defaultMessage: 'Trading grant is invalid or expired',
  },
  'trading.error.grant_revoked': {
    id: 'trading.error.grant_revoked',
    defaultMessage: 'Trading grant is revoked',
  },
  'trading.error.historical_live_request': {
    id: 'trading.error.historical_live_request',
    defaultMessage: 'Historical environments cannot request current market data',
  },
  'trading.error.ibkr_cancellation_unavailable': {
    id: 'trading.error.ibkr_cancellation_unavailable',
    defaultMessage:
      'IBKR cancellation is unavailable until its authenticated schema is verified. Check and cancel outstanding orders in IBKR; revoking access does not cancel them.',
  },
  'trading.error.ibkr_connection_check_required': {
    id: 'trading.error.ibkr_connection_check_required',
    defaultMessage: 'Test the IBKR connector to discover the tools authorized for this account.',
  },
  'trading.error.ibkr_connection_disabled': {
    id: 'trading.error.ibkr_connection_disabled',
    defaultMessage: 'Enable the official IBKR MCP connector in Connectors.',
  },
  'trading.error.ibkr_connection_required': {
    id: 'trading.error.ibkr_connection_required',
    defaultMessage: 'Add the official IBKR MCP connector and sign in directly with IBKR.',
  },
  'trading.error.ibkr_oauth_required': {
    id: 'trading.error.ibkr_oauth_required',
    defaultMessage: "Sign in directly with IBKR through the connector's OAuth setup.",
  },
  'trading.error.ibkr_reconciliation_unavailable': {
    id: 'trading.error.ibkr_reconciliation_unavailable',
    defaultMessage:
      'IBKR reconciliation is unavailable until broker order and execution receipts are verified. Check order status and fills directly in IBKR.',
  },
  'trading.error.ibkr_schema_review_required': {
    id: 'trading.error.ibkr_schema_review_required',
    defaultMessage:
      'IBKR managed execution is unavailable: the authenticated AI Partition tool schemas and broker receipts for client order identity, lookup, fills and cancellation have not been verified. Standard IBKR trade instructions require your submission.',
  },
  'trading.error.instrument_outside_mandate': {
    id: 'trading.error.instrument_outside_mandate',
    defaultMessage: 'Instrument is outside the mandate universe',
  },
  'trading.error.invalid_input': {
    id: 'trading.error.invalid_input',
    defaultMessage: 'Invalid trading input',
  },
  'trading.error.lease_duration_invalid': {
    id: 'trading.error.lease_duration_invalid',
    defaultMessage: 'Agent lease must be between 1 and 600 seconds',
  },
  'trading.error.live_account_prerequisites': {
    id: 'trading.error.live_account_prerequisites',
    defaultMessage:
      'Start live management with a dedicated cash-only funded account without open orders',
  },
  'trading.error.live_authorization_required': {
    id: 'trading.error.live_authorization_required',
    defaultMessage: 'Human authorization is required for a live run',
  },
  'trading.error.mandate_changed_activate': {
    id: 'trading.error.mandate_changed_activate',
    defaultMessage: 'Mandate changed; review the latest revision before activating',
  },
  'trading.error.mandate_changed_amend': {
    id: 'trading.error.mandate_changed_amend',
    defaultMessage: 'Mandate changed; review the latest revision before amending',
  },
  'trading.error.mandate_expired': {
    id: 'trading.error.mandate_expired',
    defaultMessage: 'Trading mandate has expired',
  },
  'trading.error.market_source_not_authorized': {
    id: 'trading.error.market_source_not_authorized',
    defaultMessage:
      'The reviewed data source is supplied; current Yahoo requests are not authorized',
  },
  'trading.error.market_symbol_format': {
    id: 'trading.error.market_symbol_format',
    defaultMessage: 'Unsupported current market symbol format',
  },
  'trading.error.model_budget_exhausted': {
    id: 'trading.error.model_budget_exhausted',
    defaultMessage: 'Agent model budget is exhausted',
  },
  'trading.error.notional_limit': {
    id: 'trading.error.notional_limit',
    defaultMessage: 'Order exceeds the mandate notional limit',
  },
  'trading.error.observation_count': {
    id: 'trading.error.observation_count',
    defaultMessage: 'Supply between 1 and 2000 observations',
  },
  'trading.error.observation_early': {
    id: 'trading.error.observation_early',
    defaultMessage: 'Observation cannot be available before its timestamp',
  },
  'trading.error.observation_fx_missing': {
    id: 'trading.error.observation_fx_missing',
    defaultMessage: 'Missing observation currency FX rate',
  },
  'trading.error.observation_missing': {
    id: 'trading.error.observation_missing',
    defaultMessage: 'No market observation is available at the environment time',
  },
  'trading.error.observation_rewrite': {
    id: 'trading.error.observation_rewrite',
    defaultMessage: 'An observation timestamp cannot be silently rewritten',
  },
  'trading.error.observation_stale': {
    id: 'trading.error.observation_stale',
    defaultMessage: 'Market observation is stale',
  },
  'trading.error.order_account_mismatch': {
    id: 'trading.error.order_account_mismatch',
    defaultMessage: 'Order currency and venue must match its allocated account',
  },
  'trading.error.order_outside_run': {
    id: 'trading.error.order_outside_run',
    defaultMessage: 'Order is outside this run',
  },
  'trading.error.outside_period': {
    id: 'trading.error.outside_period',
    defaultMessage: 'Current time is outside the trading mandate period',
  },
  'trading.error.paper_clock': {
    id: 'trading.error.paper_clock',
    defaultMessage: 'Paper clock follows current time',
  },
  'trading.error.pause_before_amend': {
    id: 'trading.error.pause_before_amend',
    defaultMessage: 'Pause the workspace and settle its current work before amending the mandate',
  },
  'trading.error.position_insufficient': {
    id: 'trading.error.position_insufficient',
    defaultMessage: 'Insufficient unreserved position quantity',
  },
  'trading.error.principal_wrong_run': {
    id: 'trading.error.principal_wrong_run',
    defaultMessage: 'Trading principal is bound to another run',
  },
  'trading.error.provider_identity_missing': {
    id: 'trading.error.provider_identity_missing',
    defaultMessage: 'Broker adapter did not establish a canonical provider identity',
  },
  'trading.error.quote_fx_missing': {
    id: 'trading.error.quote_fx_missing',
    defaultMessage: 'Missing quote currency FX rate',
  },
  'trading.error.reconciliation_required': {
    id: 'trading.error.reconciliation_required',
    defaultMessage: 'Broker state differs from allocated account; reconciliation required',
  },
  'trading.error.record_not_found': {
    id: 'trading.error.record_not_found',
    defaultMessage: 'Trading record not found',
  },
  'trading.error.request_account_mismatch': {
    id: 'trading.error.request_account_mismatch',
    defaultMessage: 'Requested venue and currency must match an allocated account',
  },
  'trading.error.request_asset_class': {
    id: 'trading.error.request_asset_class',
    defaultMessage: 'Requested asset class is outside the mandate',
  },
  'trading.error.request_id_conflict': {
    id: 'trading.error.request_id_conflict',
    defaultMessage: 'Request ID was already used for a different order',
  },
  'trading.error.request_instrument': {
    id: 'trading.error.request_instrument',
    defaultMessage: 'Requested instrument is outside the explicit mandate universe',
  },
  'trading.error.review_before_start': {
    id: 'trading.error.review_before_start',
    defaultMessage: "Review the workspace's environment and allocation before starting",
  },
  'trading.error.run_not_running': {
    id: 'trading.error.run_not_running',
    defaultMessage: 'Trading run is not running',
  },
  'trading.error.run_state_action': {
    id: 'trading.error.run_state_action',
    defaultMessage:
      'Run must be {expected, select, ready {ready} paused {paused} other {{expected}}} to {action, select, start {start} resume {resume} other {{action}}}',
  },
  'trading.error.runtime_fields_unsupported': {
    id: 'trading.error.runtime_fields_unsupported',
    defaultMessage: 'Unsupported trading runtime fields',
  },
  'trading.error.simulated_real_book': {
    id: 'trading.error.simulated_real_book',
    defaultMessage: 'Simulated executions cannot enter the real book',
  },
  'trading.error.subscription_limit': {
    id: 'trading.error.subscription_limit',
    defaultMessage: 'A workspace can subscribe to at most 100 instruments',
  },
  'trading.error.testnet_real_book': {
    id: 'trading.error.testnet_real_book',
    defaultMessage: 'Binance Spot Testnet cannot be linked to the real book',
  },
  'trading.error.unfinished_environment': {
    id: 'trading.error.unfinished_environment',
    defaultMessage: 'This workspace already has an unfinished environment; resume or end it first',
  },
  'trading.error.usage_receipt_invalid': {
    id: 'trading.error.usage_receipt_invalid',
    defaultMessage: 'Usage needs a unique receipt ID and nonnegative cost',
  },
  'trading.error.workspace_fields_unknown': {
    id: 'trading.error.workspace_fields_unknown',
    defaultMessage: 'Unknown workspace fields',
  },
  'trading.error.yahoo_currency': {
    id: 'trading.error.yahoo_currency',
    defaultMessage: 'The current Yahoo feed supports USD-quoted instruments only',
  },
  'trading.notice.billing_unknown': {
    id: 'trading.notice.billing_unknown',
    defaultMessage:
      "Previous model usage is unknown. Reconcile the interrupted turn's billing before continuing paid work.",
  },
  'trading.notice.conditions_changed': {
    id: 'trading.notice.conditions_changed',
    defaultMessage: 'Mandate or execution conditions changed after this comparison was created',
  },
  'trading.notice.data_context_available': {
    id: 'trading.notice.data_context_available',
    defaultMessage: 'Data available at this decision',
  },
  'trading.notice.data_context_missing': {
    id: 'trading.notice.data_context_missing',
    defaultMessage: 'Data context not recorded',
  },
  'trading.notice.data_context_usage': {
    id: 'trading.notice.data_context_usage',
    defaultMessage:
      'Recorded availability context; exact consumption is shown by tool inputs/results.',
  },
  'trading.notice.decision_data_missing': {
    id: 'trading.notice.decision_data_missing',
    defaultMessage: 'Data available at this decision was not recorded',
  },
  'trading.notice.decision_missing': {
    id: 'trading.notice.decision_missing',
    defaultMessage: 'Decision link not recorded',
  },
  'trading.notice.different_times': {
    id: 'trading.notice.different_times',
    defaultMessage: 'Historical runs are at different environment times',
  },
  'trading.notice.external_verification': {
    id: 'trading.notice.external_verification',
    defaultMessage: 'External participant information access requires independent verification',
  },
  'trading.notice.live_authorization_required': {
    id: 'trading.notice.live_authorization_required',
    defaultMessage:
      'Explicit account-specific human authorization is required to start live trading.',
  },
  'trading.notice.live_review': {
    id: 'trading.notice.live_review',
    defaultMessage:
      'Starting real trading requires verified account authority and execution prerequisites.',
  },
  'trading.notice.model_contamination': {
    id: 'trading.notice.model_contamination',
    defaultMessage: 'Historical model-knowledge contamination is not eliminated',
  },
  'trading.notice.observations_missing': {
    id: 'trading.notice.observations_missing',
    defaultMessage:
      'Some recorded data references are no longer present in the retained market series',
  },
  'trading.notice.recovery_billing': {
    id: 'trading.notice.recovery_billing',
    defaultMessage:
      'Previous work was interrupted; billing must be reconciled before another paid turn.',
  },
  'trading.notice.recovery_ready': {
    id: 'trading.notice.recovery_ready',
    defaultMessage: 'Persistent workspace is ready to continue.',
  },
  'trading.notice.strategy_required': {
    id: 'trading.notice.strategy_required',
    defaultMessage:
      'The executor must provide strategy code before automatic script work can start.',
  },
  'trading.notice.valuation_incomplete': {
    id: 'trading.notice.valuation_incomplete',
    defaultMessage: 'One or more valuations are incomplete',
  },
})

// src/errors/ErrorCodes.ts
export const ErrorCode = {
    WALLET_NOT_CONNECTED: "err_wallet_not_connected",
    PROFILE_EXISTS: "err_profile_exists",
    PROFILE_NOT_FOUND: "err_profile_not_found",
    INVALID_LOGIN: "err_invalid_login",
    NETWORK_ERROR: "err_network",
    UNEXPECTED: "err_unexpected",

    IS_NOT_DEPLOYED: "err_is_not_deployed",
    CONTRACT_DOES_NOT_BELONG: "err_contract_doesnot_belong_to_the_wallet",
    INVALID_WALLET_ADDRESS: "err_invalid_wallet_address",
    NETWORK_TIMEOUT: "err_network_timeout",
    RPC_UNREACHABLE: "err_rpc_unreachable",
    BALANCE_FETCH_FAILED: "err_balance_fetch_failed",

    LOCAL_STORAGE_READ_FAILED: "err_local_storage_read_failed",
    LOCAL_STORAGE_WRITE_FAILED: "err_local_storage_write_failed",
    LOCAL_STORAGE_CLEAR_FAILED: "err_local_storage_clear_failed",

    USER_REJECTED_TRANSACTION: "err_user_rejected_transaction",
    TRANSACTION_FAILED: "err_transaction_failed"

} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
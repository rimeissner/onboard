
import SafeAppsSDK, { SafeInfo } from '@gnosis.pm/safe-apps-sdk'

const NETWORK_CHAIN_ID: Record<string, number> = {
    'MAINNET': 1,
    'RINKEBY': 4
}

// taken from ethers.js, compatible interface with web3 provider
type AsyncSendable = {
    isMetaMask?: boolean
    host?: string
    path?: string
    sendAsync?: (request: any, callback: (error: any, response: any) => void) => void
    send?: (request: any, callback: (error: any, response: any) => void) => void
}

function getLowerCase(value: string): string {
    if (value) {
        return value.toLowerCase();
    }
    return value;
}

export class SafeAppProvider implements AsyncSendable {

    private readonly safe: SafeInfo
    private readonly sdk: SafeAppsSDK

    constructor(safe: SafeInfo, sdk: SafeAppsSDK) {
        this.safe = safe
        this.sdk = sdk
    }

    public get chainId(): number {
        return NETWORK_CHAIN_ID[this.safe.network]
    }

    sendAsync(request: any, callback: (error: any, response: any) => void): void {
        this.send(request, callback)
    }

    send(request: any, callback: (error: any, response?: any) => void): void {
        if (!request) callback("Undefined request")
        this.request(request)
            .then(result => callback(null, { jsonrpc: '2.0', id: request.id, result }))
            .catch(error => callback(error, null))
    }

    async request(request: { method: string, params: any[] }): Promise<any> {
        console.error(request.method, request.params)
        const params = request.params
        switch (request.method) {
            case 'net_version':
            case 'eth_chainId':
                return `0x${this.chainId.toString(16)}`

            case 'eth_sendTransaction':
                console.error({ params })
                const tx = await this.sdk.txs.send({
                    txs: params.map((tx) => {
                        return {
                            value: "0",
                            data: "0x",
                            ...tx
                        }
                    })
                });
                return tx.safeTxHash;

            case 'eth_blockNumber':
                const block = await this.sdk.eth.getBlockByNumber(['latest']);

                return block.number;

            case 'eth_getBalance':
                return this.sdk.eth.getBalance([getLowerCase(params[0]), params[1]]);

            case 'eth_getCode':
                return this.sdk.eth.getCode([getLowerCase(params[0]), params[1]]);

            case 'eth_getStorageAt':
                return this.sdk.eth.getStorageAt([getLowerCase(params[0]), params[1], params[2]]);

            case 'eth_getBlockByNumber':
                return this.sdk.eth.getBlockByNumber([params[0], params[1]]);

            case 'eth_getBlockByHash':
                return this.sdk.eth.getBlockByHash([params[0], params[1]]);

            case 'eth_getTransactionByHash':
                let txHash = params[0]
                try {
                    const resp = await this.sdk.txs.getBySafeTxHash(txHash)
                    txHash = resp.transactionHash || txHash
                } catch (e) { }
                return this.sdk.eth.getTransactionByHash([txHash])

            case 'eth_getTransactionReceipt': {
                let txHash = params[0]
                try {
                    const resp = await this.sdk.txs.getBySafeTxHash(txHash)
                    txHash = resp.transactionHash || txHash
                } catch (e) { }
                return this.sdk.eth.getTransactionReceipt([txHash])
            }

            case 'eth_estimateGas': {
                return 0;
            }

            case 'eth_call': {
                return this.sdk.eth.call([params[0], params[1]]);
            }

            case 'eth_getLogs':
                return this.sdk.eth.getPastLogs([params[0]]);

            default:
                throw Error(`"${request.method}" not implemented`)
        }
    }
}
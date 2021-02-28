import { wallet, walletInterface } from '../../stores'
import {
    WalletInterface
} from '../../interfaces'
import { SafeAppProvider } from './provider'
import SafeAppsSDK, { SafeInfo } from '@gnosis.pm/safe-apps-sdk'

const sdk = new SafeAppsSDK()

export function checkSafeApp(): Promise<any> {
    return Promise.race([
        sdk.getSafeInfo(),
        new Promise<undefined>((resolve) => setTimeout(resolve, 100))
    ]).then(
        (safe: SafeInfo | undefined) => {
            if (!safe) return

            const provider = new SafeAppProvider(safe, sdk)

            const safeInterface: WalletInterface = {
                name: 'Safe Apps',
                //connect?: Connect | null
                //disconnect?: () => void
                address: {
                    get: () => Promise.resolve(safe.safeAddress)
                },
                network: {
                    get: () => Promise.resolve(provider.chainId)
                },
                balance: { }
                //dashboard?: () => void
            }

            walletInterface.update((currentInterface: WalletInterface | null) => {
                if (currentInterface && currentInterface.disconnect) {
                    currentInterface.disconnect()
                }

                return safeInterface
            })
            wallet.set({
                provider,
                instance: sdk,
                dashboard: safeInterface.dashboard,
                name: safeInterface.name,
                connect: safeInterface.connect,
                type: 'sdk'
            })
        }
    )
}

export default checkSafeApp

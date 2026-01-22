import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'AaveV3Composer'

const deploy: DeployFunction = async (hre) => {
    const { deployments, getNamedAccounts, ethers, network } = hre
    const { deploy } = deployments

    const { deployer } = await getNamedAccounts()
    assert(deployer, 'Missing named deployer account')

    // Support both generic and network-specific env vars (e.g. AAVE_V3_POOL_ADDRESS_BASE_MAINNET)
    const toPoolKey = (base: string) => `${base}_${network.name.toUpperCase().replace(/-/g, '_')}`

    const aavePool = process.env.AAVE_V3_POOL_ADDRESS || process.env[toPoolKey('AAVE_V3_POOL_ADDRESS')]
    const stargatePool = process.env.STARGATE_POOL_ADDRESS || process.env[toPoolKey('STARGATE_POOL_ADDRESS')]

    assert(aavePool, `Missing AAVE_V3_POOL_ADDRESS or ${toPoolKey('AAVE_V3_POOL_ADDRESS')}`)
    assert(stargatePool, `Missing STARGATE_POOL_ADDRESS or ${toPoolKey('STARGATE_POOL_ADDRESS')}`)

    const { isAddress } = ethers.utils
    assert(isAddress(aavePool), `AAVE_V3_POOL_ADDRESS (${aavePool}) is not a valid address`)
    assert(isAddress(stargatePool), `STARGATE_POOL_ADDRESS (${stargatePool}) is not a valid address`)

    console.log(`Network: ${network.name}`)
    console.log(`Deployer: ${deployer}`)
    console.log(`Aave pool: ${aavePool}`)
    console.log(`Stargate pool: ${stargatePool}`)

    const result = await deploy(contractName, {
        from: deployer,
        args: [aavePool, stargatePool],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    // Some RPCs return contractAddress: null; recover via CREATE address if needed
    const address =
        result.address ||
        (await (async () => {
            assert(result.transactionHash, 'Missing transactionHash; cannot recover address')
            const tx = await ethers.provider.getTransaction(result.transactionHash)
            assert(tx, `Could not fetch tx: ${result.transactionHash}`)
            const recovered = ethers.utils.getContractAddress({ from: tx.from, nonce: tx.nonce })
            await deployments.save(contractName, { ...result, address: recovered } as any)
            return recovered
        })())

    console.log(`Deployed contract: ${contractName}, network: ${network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy

import { useState } from 'react';
import { BigNumber, Contract, ContractReceipt, ContractTransaction, providers, Signer } from 'ethers';

import nftFactoryAbi from './nftFactory.json'
import erc721Abi from './erc721.json'
import bl3ndAbi from './bl3ndAbi.json'

import './App.css';

const nftFactoryAddress = '0x744568c5943a5d00d0c51ead20122631937B9715'
const bl3ndAddress = '0x3Ab5eDd57989ea705C44f3831A9Fb6e6677b0fB2'

const baycAddressStorageKey = 'bayc-address'
const lootAddressStorageKey = 'loot-address'

const baycIds = [
  3650, // https://opensea.io/assets/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/3650
  4671, // https://opensea.io/assets/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/4671
  3368, // https://opensea.io/assets/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/3368
]

const lootIds = [
  5229, // https://opensea.io/assets/0xff9c1b15b16263c61d017ee9f65c50e4ae0113d7/5229
  5917, // https://opensea.io/assets/0xff9c1b15b16263c61d017ee9f65c50e4ae0113d7/4671
  1441, // https://opensea.io/assets/0xff9c1b15b16263c61d017ee9f65c50e4ae0113d7/3368
]

declare global {
  interface Window { ethereum: any }
}

const NFTRow = ({ id, owner, choose }: { id: number, owner: string, choose: () => void }) => <>
  <p>Id: {id} - owner: {owner}</p>
  <button onClick={choose}>bl3nd me</button>
</>

type ChosenNFT = { id: number, contract: Contract }

function App() {
  const [signer, setSigner] = useState<Signer>()
  const [account, setAccount] = useState('')

  const [nftFactory, setNftFactory] = useState<Contract>()
  const [bl3nd, setBl3nd] = useState<Contract>()

  const [baycDeployTx, setBaycDeployTx] = useState<ContractTransaction>()
  const [baycDeployTxSuccess, setBaycDeployTxSuccess] = useState(false)
  const [bayc, setBayc] = useState<Contract>()

  const [baycOwners, setBaycOwners] = useState(['', '', ''])

  const [lootDeployTx, setLootDeployTx] = useState<ContractTransaction>()
  const [lootDeployTxSuccess, setLootDeployTxSuccess] = useState(false)
  const [loot, setLoot] = useState<Contract>()

  const [lootOwners, setLootOwners] = useState(['', '', ''])

  const [nft1, setNFT1] = useState<ChosenNFT>()
  const [nft2, setNFT2] = useState<ChosenNFT>()

  const [blendTx, setBlendTx] = useState<ContractTransaction>()
  const [blendTxSuccess, setBlendTxSuccess] = useState(false)
  const [mintedTokenId, setMintedTokenId] = useState('')
  const [mintedTokenOwner, setMintedTokenOwner] = useState('')

  const connect = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    setAccount(accounts[0])

    const web3Provider = new providers.Web3Provider(window.ethereum)
    const signer = web3Provider.getSigner()
    setSigner(signer)

    const nftFactoryContract = new Contract(nftFactoryAddress, nftFactoryAbi, signer)
    setNftFactory(nftFactoryContract)

    setBl3nd(new Contract(bl3ndAddress, bl3ndAbi, signer))

    const baycAddress = localStorage.getItem(baycAddressStorageKey)
    if (baycAddress) {
      const baycContract = new Contract(baycAddress, erc721Abi, signer)
      setBayc(baycContract)
      await getBaycOwners(baycContract)
    }

    const lootAddress = localStorage.getItem(lootAddressStorageKey)
    if (lootAddress) {
      const lootContract = new Contract(lootAddress, erc721Abi, signer)
      setLoot(lootContract)
      await getLootOwners(lootContract)
    }
  }

  const deployBayc = async () => {
    const tx = await nftFactory!.createNFT('BoredApeYachtClub', 'BAYC', baycIds)

    setBaycDeployTx(tx)

    const receipt: ContractReceipt = await tx.wait()

    setBaycDeployTxSuccess(true)

    const nftAddress = receipt.events!.find(e => e.address === nftFactoryAddress)!.args!.contractAddress

    const baycContract = new Contract(nftAddress, erc721Abi, signer)
    setBayc(baycContract)

    localStorage.setItem(baycAddressStorageKey, nftAddress)

    await getBaycOwners(baycContract)
  }

  const deployLoot = async () => {
    const tx = await nftFactory!.createNFT('Loot', 'LOOT', lootIds)

    setLootDeployTx(tx)

    const receipt: ContractReceipt = await tx.wait()

    setLootDeployTxSuccess(true)

    const nftAddress = receipt.events!.find(e => e.address === nftFactoryAddress)!.args!.contractAddress

    const lootContract = new Contract(nftAddress, erc721Abi, signer)
    setLoot(lootContract)

    localStorage.setItem(lootAddressStorageKey, nftAddress)

    await getLootOwners(lootContract)
  }

  const getBaycOwners = async (baycContract?: Contract) => {
    const owners = await Promise.all(baycIds.map((id) => (bayc || baycContract)!.ownerOf(id)))
    setBaycOwners(owners)
  }

  const getLootOwners = async (lootContract?: Contract) => {
    const owners = await Promise.all(lootIds.map((id) => (loot || lootContract)!.ownerOf(id)))
    setLootOwners(owners)
  }

  const blend = async () => {
    await nft1!.contract.approve(bl3nd!.address, nft1!.id).then((tx: ContractTransaction) => tx.wait())
    await nft2!.contract.approve(bl3nd!.address, nft2!.id).then((tx: ContractTransaction) => tx.wait())
    const tx: ContractTransaction = await bl3nd!.blend(nft1!.contract.address, nft1!.id, nft2!.contract.address, nft2!.id)
    setBlendTx(tx)

    const receipt = await tx.wait()
    setBlendTxSuccess(true)

    const { tokenId, to }: { tokenId: BigNumber, to: string } = receipt.events!.find(e => e.address === bl3ndAddress)!.args! as any

    console.log(tokenId, to)

    setMintedTokenId(tokenId.toHexString())
    setMintedTokenOwner(to)

    await getBaycOwners()
    await getLootOwners()
  }

  return (
    <div className="App">
      <div className='connect-wallet'>
        <button onClick={connect}>Connect wallet</button>
        <p>Account: {account}</p>
      </div>
      <div className='fusion'>
        <div className="column">
          <h3>BAYC NFT</h3>
          <button onClick={deployBayc} disabled={!!bayc}>deploy</button>
          {baycDeployTx && <p>Tx: {baycDeployTx.hash}{baycDeployTxSuccess && ' success'}</p>}
          <p>Address: {bayc && bayc.address}</p>
          {baycIds.map((id, i) => <NFTRow key={id} id={id} owner={baycOwners[i]} choose={() => setNFT1({ id, contract: bayc! })}/>)}
        </div>
        <div className="column">
          <h2>Bl3nder</h2>
          <p>Address: {bl3ndAddress}</p>
          <p>NFT 1: {nft1 && nft1.id}</p>
          <p>NFT 2: {nft2 && nft2.id}</p>
          <button disabled={!(nft1 && nft2)} onClick={blend}>Bl3nd!</button>
          {
            blendTx && <>
              <p>{blendTx.hash}{blendTxSuccess && ' success! Token was minted'}</p>
              <p>Token id: {mintedTokenId}</p>
              <p>Token owner: {mintedTokenOwner}</p>
            </>
          }
        </div>
        <div className="column">
          <h3>Loot NFT</h3>
          <button onClick={deployLoot} disabled={!!loot}>deploy</button>
          {lootDeployTx && <p>Tx: {lootDeployTx.hash}{lootDeployTxSuccess && ' success'}</p>}
          <p>Address: {loot && loot.address}</p>
          {lootIds.map((id, i) => <NFTRow key={id} id={id} owner={lootOwners[i]} choose={() => setNFT2({ id, contract: loot! })} />)}
        </div>
      </div>
    </div>
  );
}

export default App;

import { useState } from 'react';
import { BigNumber, Contract, ContractReceipt, ContractTransaction, providers, Signer } from 'ethers';
import axios from 'axios'

import nftFactoryAbi from './nftFactory.json'
import erc721Abi from './erc721.json'
import bl3ndAbi from './bl3ndAbi.json'

import './App.css';

import logo from './assets/logo.png'
import coolcatImage from './assets/coolcat.png'
import baycImage from './assets/bayc.png'
import starImage from './assets/star.png'
import podioCard from './assets/podio_card.png'

const nftFactoryAddress = '0x744568c5943a5d00d0c51ead20122631937B9715'
const bl3ndAddress = '0x3Ab5eDd57989ea705C44f3831A9Fb6e6677b0fB2'

const baycAddressStorageKey = 'bayc-address'
const doodlesAddressStorageKey = 'doodles-address'
const blendsStorageKey = 'blends-ids'

const baycIds = [
  3650, // https://opensea.io/assets/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/3650
  4671, // https://opensea.io/assets/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/4671
  3368, // https://opensea.io/assets/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/3368
]

const baycBaseUri = 'https://ipfs.io/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/'

const doodlesIds = [
  4889, // https://opensea.io/assets/0x8a90cab2b38dba80c64b7734e58ee1db38b8992e/4889
  3701, // https://opensea.io/assets/0x8a90cab2b38dba80c64b7734e58ee1db38b8992e/3701
  2952, // https://opensea.io/assets/0x8a90cab2b38dba80c64b7734e58ee1db38b8992e/2952
]

const doodlesBaseUri = 'https://ipfs.io/ipfs/QmPMc4tcBsMqLRuCQtPmPe84bpSjrC3Ky7t3JWuHXYB4aS/'

declare global {
  interface Window { ethereum: any }
}

const NFTRow = ({ id, owner, choose, meta }: { id: number, owner: string, choose: () => void, meta: any }) => <>
  <img src={meta.image} height={200} />
  <p>Id: {id} - owner: {owner}</p>
  <p><button onClick={choose}>bl3nd me</button></p>
  <table>
    <thead>
      <tr>
        <th>Trait type</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      {meta && meta.attributes.map((attr: any) => <tr>
        <td>{attr.trait_type}</td>
        <td>{attr.value}</td>
      </tr>)}
    </tbody>
  </table>
</>

type ChosenNFT = { id: number, contract: Contract }

const getMeta = (ids: number[], baseURI: string) => Promise.all(ids.map((id) => axios.get(baseURI + id).then(res => res.data).then(data => {
  data.image = data.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
  return data
})))

const getBlends = () => JSON.parse(localStorage.getItem(blendsStorageKey) || JSON.stringify([]))

function App() {
  const [signer, setSigner] = useState<Signer>()
  const [account, setAccount] = useState('')

  const [nftFactory, setNftFactory] = useState<Contract>()
  const [bl3nd, setBl3nd] = useState<Contract>()

  const [baycDeployTx, setBaycDeployTx] = useState<ContractTransaction>()
  const [baycDeployTxSuccess, setBaycDeployTxSuccess] = useState(false)
  const [bayc, setBayc] = useState<Contract>()

  const [baycOwners, setBaycOwners] = useState(['', '', ''])
  const [baycMeta, setBaycMeta] = useState(['', '', ''])

  const [doodlesDeployTx, setDoodlesDeployTx] = useState<ContractTransaction>()
  const [doodlesDeployTxSuccess, setDoodlesDeployTxSuccess] = useState(false)
  const [doodles, setDoodles] = useState<Contract>()

  const [doodlesOwners, setDoodlesOwners] = useState(['', '', ''])
  const [doodlesMeta, setDoodlesMeta] = useState(['', '', ''])

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
      await getBaycOwnersAndMeta(baycContract)
    }

    const doodlesAddress = localStorage.getItem(doodlesAddressStorageKey)
    if (doodlesAddress) {
      const doodlesContract = new Contract(doodlesAddress, erc721Abi, signer)
      setDoodles(doodlesContract)
      await getDoodlesOwnersAndMeta(doodlesContract)
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

    await getBaycOwnersAndMeta(baycContract)
  }

  const deployDoodles = async () => {
    const tx = await nftFactory!.createNFT('Doodles', 'DOODLE', doodlesIds)

    setDoodlesDeployTx(tx)

    const receipt: ContractReceipt = await tx.wait()

    setDoodlesDeployTxSuccess(true)

    const nftAddress = receipt.events!.find(e => e.address === nftFactoryAddress)!.args!.contractAddress

    const doodlesContract = new Contract(nftAddress, erc721Abi, signer)
    setDoodles(doodlesContract)

    localStorage.setItem(doodlesAddressStorageKey, nftAddress)

    await getDoodlesOwnersAndMeta(doodlesContract)
  }

  const getBaycOwnersAndMeta = async (baycContract?: Contract) => {
    const owners = await Promise.all(baycIds.map((id) => (bayc || baycContract)!.ownerOf(id)))
    const meta = await getMeta(baycIds, baycBaseUri)

    setBaycOwners(owners)
    setBaycMeta(meta)
  }

  const getDoodlesOwnersAndMeta = async (doodlesContract?: Contract) => {
    const owners = await Promise.all(doodlesIds.map((id) => (doodles || doodlesContract)!.ownerOf(id)))
    const meta = await getMeta(doodlesIds, doodlesBaseUri)

    setDoodlesOwners(owners)
    setDoodlesMeta(meta)
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

    const oldBlends = getBlends()
    localStorage.setItem(blendsStorageKey, JSON.stringify([...oldBlends, tokenId.toHexString()]))

    setMintedTokenId(tokenId.toHexString())
    setMintedTokenOwner(to)

    await getBaycOwnersAndMeta()
    await getDoodlesOwnersAndMeta()
  }

  return <div className='main'>
    <div className='header'>
      <div className='logo-container'>
        <img src={logo} className='logo' />
      </div>
      <div className='options-container'>
        <a className='github-link' href='https://github.com/wakeupdao' target='_blank'>GITHUB</a>
        <button onClick={connect} disabled={!!signer}>{!signer ? 'Connect wallet' : `${account.slice(0, 6)}...${account.slice(-4)}`}</button>
      </div>
    </div>
    <div className='landing'>
      <div className='landing-text-container'>
        <div className='landing-row'>
          <p className='landing-title'>Have —fun</p><img src={starImage} height={72} />
        </div>
        <div className='landing-row'>
          <p className='landing-title'><img src={coolcatImage} height={72} /> with your</p>
        </div>
        <div className='landing-row'>
          <p className='landing-title'>nft collection</p><img src={baycImage} height={92} />
        </div>
        <div className='landing-row'>
          <p className='landing-subtitle'>Generate super rare NFTs by yourself, by mixing your beloved NFT collection. Let 's Bl3nd them! | by Wake Up DAO</p>
        </div>
      </div>
      <div className='landing-image-container'>
        <img src={podioCard} height={350} />
      </div>
    </div>
    <div className="app">
      <h2>Bl3nder</h2>
      <div className='fusion'>
        <div className="column">
          <h3>BAYC NFT</h3>
          <button onClick={deployBayc} disabled={!!bayc}>deploy</button>
          {baycDeployTx && <p>Tx: {baycDeployTx.hash}{baycDeployTxSuccess && ' success'}</p>}
          <p>Address: {bayc && bayc.address}</p>
          {bayc && baycIds.map((id, i) => <NFTRow key={id} id={id} owner={baycOwners[i]} choose={() => setNFT1({ id, contract: bayc! })} meta={baycMeta[i]} />)}
        </div>
        <div className="column">
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
          <h3>Doodles NFT</h3>
          <button onClick={deployDoodles} disabled={!!doodles}>deploy</button>
          {doodlesDeployTx && <p>Tx: {doodlesDeployTx.hash}{doodlesDeployTxSuccess && ' success'}</p>}
          <p>Address: {doodles && doodles.address}</p>
          {doodles && doodlesIds.map((id, i) => <NFTRow key={id} id={id} owner={doodlesOwners[i]} choose={() => setNFT2({ id, contract: doodles! })} meta={doodlesMeta[i]} />)}
        </div>
      </div>
      <div>
        <h3>Bl3nd</h3>
        <p>Address: {bl3ndAddress}</p>
        <ul>
          {getBlends().map((blendTokenId: string) => <li key={blendTokenId}>{blendTokenId}</li>)}
        </ul>
      </div>
    </div>
  </div>
}

export default App;

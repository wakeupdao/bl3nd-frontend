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
import { getCard } from './cards/lib';

const nftFactoryAddress = '0x2FC2fdc05bdEa93297d572599E156D43531a6768'
const bl3ndAddress = '0x63Cd2E816Fc29B42B993F8cA7283e528F29484F9'
// crypt: 0xde2f9074F2A2b820B532F34c36e58f0233B655A5

const baycAddressStorageKey = 'bayc-address'
const doodlesAddressStorageKey = 'doodles-address'
const blendsStorageKey = 'blends-ids'

const baycIds = [
  3650, // https://opensea.io/assets/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/3650
  4671, // https://opensea.io/assets/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/4671
  3368, // https://opensea.io/assets/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/3368
]

const baycBaseUri = 'https://ipfs.io/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/'
// const baycBaseUri = 'http://localhost:5000/contracts/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/'

const doodlesIds = [
  4889, // https://opensea.io/assets/0x8a90cab2b38dba80c64b7734e58ee1db38b8992e/4889
  3701, // https://opensea.io/assets/0x8a90cab2b38dba80c64b7734e58ee1db38b8992e/3701
  2952, // https://opensea.io/assets/0x8a90cab2b38dba80c64b7734e58ee1db38b8992e/2952
]

const doodlesBaseUri = 'https://ipfs.io/ipfs/QmPMc4tcBsMqLRuCQtPmPe84bpSjrC3Ky7t3JWuHXYB4aS/'
// const doodlesBaseUri = 'http://localhost:5000/contracts/0x8a90cab2b38dba80c64b7734e58ee1db38b8992e/'

declare global {
  interface Window { ethereum: any }
}

const NFTRow = ({ id, owner, choose, meta, selected, small }: { id: number, owner: string, choose?: () => void, meta: any, selected: boolean, small: boolean }) => {
  const [showTraits, setShowTraits] = useState(false)

  return <div className={`nft ${selected && 'nft-selected'} ${small && 'nft-small'}`}>
    <img src={meta.image} height={small ? 300 : 200} />
    {choose && <p><button className='button' onClick={choose}>bl3nd me</button></p>}
    <button className='button-link' onClick={() => setShowTraits((v) => !v)}>{showTraits ? 'hide traits' : 'show traits'}</button>
    {showTraits && meta && meta.attributes && meta.attributes.map((attr: any) => <p className='trait'><b>{attr.trait_type}</b>: {attr.value}</p>)}
    <p>Id: {id.toString().length > 10 ? shorten(id.toString()) : id.toString()} - owner: {shorten(owner)}</p>
  </div>
}

type ChosenNFT = { id: number, contract: Contract }

const getMeta = (ids: number[], baseURI: string) => Promise.all(ids.map((id) => axios.get(baseURI + id).then(res => res.data).then(data => {
  data.image = data.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
  console.log(data)
  return data
})))

const getBlends = () => JSON.parse(localStorage.getItem(blendsStorageKey) || JSON.stringify([]))

const shorten = (str: string) => `${str.slice(0, 6)}...${str.slice(-4)}`

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

  const [blending, setBlending] = useState(false)

  const [approveBaycTx, setApproveBaycTx] = useState<ContractTransaction>()
  const [approveBaycTxSuccess, setApproveBaycTxSuccess] = useState(false)

  const [approveDoodlesTx, setApproveDoodlesTx] = useState<ContractTransaction>()
  const [approveDoodlesTxSuccess, setApproveDoodlesTxSuccess] = useState(false)

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
    setBlending(true)

    const approveBaycTx = await nft1!.contract.approve(bl3nd!.address, nft1!.id)
    setApproveBaycTx(approveBaycTx)
    await approveBaycTx.wait()
    setApproveBaycTxSuccess(true)

    const approveDoodlesTx = await nft2!.contract.approve(bl3nd!.address, nft2!.id)
    setApproveDoodlesTx(approveDoodlesTx)
    await approveDoodlesTx.wait()
    setApproveDoodlesTxSuccess(true)

    const tx: ContractTransaction = await bl3nd!.blend(nft1!.contract.address, nft1!.id, nft2!.contract.address, nft2!.id)
    setBlendTx(tx)

    const receipt = await tx.wait()
    setBlendTxSuccess(true)

    const { tokenId, to }: { tokenId: BigNumber, to: string } = receipt.events!.find(e => e.address === bl3ndAddress)!.args! as any

    console.log(tokenId, to)

    const oldBlends = getBlends()
    localStorage.setItem(blendsStorageKey, JSON.stringify([...oldBlends, {
      tokenId: tokenId.toHexString(),
      nft1TokenId: nft1!.id,
      nft2TokenId: nft2!.id
    }]))

    setMintedTokenId(tokenId.toHexString())
    setMintedTokenOwner(to)

    await getBaycOwnersAndMeta()
    await getDoodlesOwnersAndMeta()

    setBlending(false)
    setNFT1(undefined)
    setNFT2(undefined)
  }

  const reset = () => {
    localStorage.removeItem(baycAddressStorageKey)
    localStorage.removeItem(doodlesAddressStorageKey)
    localStorage.removeItem(blendsStorageKey)
    window.location.reload()
  }

  return <div className='main'>
    <div className='header'>
      <div className='logo-container'>
        <img src={logo} className='logo' />
      </div>
      <div className='options-container'>
        <a className='github-link' href='https://github.com/wakeupdao' target='_blank'>GITHUB</a>
        <button className='button' onClick={connect} disabled={!!signer}>{!signer ? 'Connect wallet' : shorten(account)}</button>
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
      <div className='description-container'>
        <div className='description'>
          <p><b>How it works?</b></p>
          <p>
            Choose two of your favorite NFTs to combine them. Once you <i>bl3nd</i> them you will mint a brand new BL3ND NFT with <b>hot new traits</b><br /><br />
            You can always <i>unbl3nd</i> your combination until you seal it, let's start <i>bl3nding</i><br /><br />
            You can treat your new BL3ND as a traditional NFT: transfer it, play with it, auction it!
          </p>
        </div>
      </div>
    </div>
    <div className="app">
      <h2>Bl3nder</h2>
      {!signer && <p>Please connect your wallet</p>}
      <div className='fusion'>
        <div className="column">
          <h3>BAYC NFT</h3>
          <button onClick={deployBayc} disabled={!!bayc} className='button'>deploy sample BAYC</button>
          {baycDeployTx && <p>Tx: {shorten(baycDeployTx.hash)}{baycDeployTxSuccess && ' success'}</p>}
          <p>Address: {bayc && shorten(bayc.address)}</p>
          <div className='column-scroll'>
            {bayc && baycIds.map((id, i) => baycOwners[i].toLowerCase() === account ? <NFTRow key={id} id={id} owner={baycOwners[i]} choose={() => setNFT1({ id, contract: bayc! })} meta={baycMeta[i]} selected={nft1?.id === id} small={false} /> : <></>)}
          </div>
        </div>
        <div className="column">
          <p><button disabled={!(nft1 && nft2) || blending} onClick={blend} className='button big-button'>Bl3nd!</button></p>
          <p><small>(requires 3 transactions: approve both tokens + bl3nd!)</small></p>
          {nft1 && nft2 && <img src={getCard(nft1.id, nft2.id)} />}
          {approveBaycTx && <p>Approving Bayc: {shorten(approveBaycTx.hash)}{approveBaycTxSuccess && ' success!'}</p>}
          {approveDoodlesTx && <p>Approving Doodles: {shorten(approveDoodlesTx.hash)}{approveDoodlesTxSuccess && ' success!'}</p>}
          {
            blendTx && <>
              <p>Bl3nding!! {shorten(blendTx.hash)}{blendTxSuccess && ' success! Token was minted'}</p>
              <p>Token id: {shorten(mintedTokenId)}</p>
              <p>Token owner: {shorten(mintedTokenOwner)}</p>
            </>
          }
        </div>
        <div className="column">
          <h3>Doodles NFT</h3>
          <button onClick={deployDoodles} disabled={!!doodles} className='button'>deploy sample Doodles</button>
          {doodlesDeployTx && <p>Tx: {shorten(doodlesDeployTx.hash)}{doodlesDeployTxSuccess && ' success'}</p>}
          <p>Address: {doodles && shorten(doodles.address)}</p>
          <div className='column-scroll'>
            {doodles && doodlesIds.map((id, i) => doodlesOwners[i].toLowerCase() === account ? <NFTRow key={id} id={id} owner={doodlesOwners[i]} choose={() => setNFT2({ id, contract: doodles! })} meta={doodlesMeta[i]} selected={nft2?.id === id} small={false} /> : <></>)}
          </div>
        </div>
      </div>
      <div className='blends'>
        <h3>Bl3nd</h3>
        <small>Address: {bl3ndAddress}</small>
        <p>Your bl3nds:</p>
        {signer && getBlends().map((blendTokenIds: { tokenId: string, nft1TokenId: number, nft2TokenId: number }) => <NFTRow key={blendTokenIds.tokenId} id={Number(blendTokenIds.tokenId)} owner={account} meta={{ image: getCard(blendTokenIds.nft1TokenId, blendTokenIds.nft2TokenId) }} selected={true} small={true} />)}
      </div>
    </div>
    <div>
      <button onClick={reset}>reset</button>
    </div>
  </div>
}

export default App;

import { useState } from 'react';
import { Contract, ContractReceipt, ContractTransaction, providers, Signer } from 'ethers';

import nftFactoryAbi from './nftFactory.json'
import erc721Abi from './erc721.json'

import './App.css';

const nftFactoryAddress = '0x744568c5943a5d00d0c51ead20122631937B9715'
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

function App() {
  const [signer, setSigner] = useState<Signer>()
  const [account, setAccount] = useState('')

  const [nftFactory, setNftFactory] = useState<Contract>()
  // const [bl3nd, setBl3nd] = useState<Contract>()

  const [baycDeployTx, setBaycDeployTx] = useState<ContractTransaction>()
  const [baycDeployTxSuccess, setBaycDeployTxSuccess] = useState(false)
  const [bayc, setBayc] = useState<Contract>()

  const [baycOwners, setBaycOwners] = useState(['', '', ''])

  const [lootDeployTx, setLootDeployTx] = useState<ContractTransaction>()
  const [lootDeployTxSuccess, setLootDeployTxSuccess] = useState(false)
  const [loot, setLoot] = useState<Contract>()

  const [lootOwners, setLootOwners] = useState(['', '', ''])

  const connect = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    setAccount(accounts[0])

    const web3Provider = new providers.Web3Provider(window.ethereum)
    const signer = web3Provider.getSigner()
    setSigner(signer)

    const nftFactoryContract = new Contract(nftFactoryAddress, nftFactoryAbi, signer)
    setNftFactory(nftFactoryContract)

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

    await getBaycOwners()
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
  }

  const getBaycOwners = async (baycContract?: Contract) => {
    const owners = await Promise.all(baycIds.map((id) => (bayc || baycContract)!.ownerOf(id)))
    setBaycOwners(owners)
  }

  const getLootOwners = async (lootContract?: Contract) => {
    const owners = await Promise.all(lootIds.map((id) => (loot || lootContract)!.ownerOf(id)))
    setLootOwners(owners)
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
          {baycIds.map((id, i) => <p key={id}>Id: {id} - owner: {baycOwners[i]}</p>)}
        </div>
        <div className="column">
          Fusion
        </div>
        <div className="column">
          <h3>Loot NFT</h3>
          <button onClick={deployLoot} disabled={!!loot}>deploy</button>
          {lootDeployTx && <p>Tx: {lootDeployTx.hash}{lootDeployTxSuccess && ' success'}</p>}
          <p>Address: {loot && loot.address}</p>
          {lootIds.map((id, i) => <p key={id}>Id: {id} - owner: {lootOwners[i]}</p>)}
        </div>
      </div>
    </div>
  );
}

export default App;

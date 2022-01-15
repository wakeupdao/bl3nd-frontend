import { useState } from 'react';
import { Contract, ContractReceipt, ContractTransaction, providers, Signer } from 'ethers';

import nftFactoryAbi from './nftFactory.json'
import erc721Abi from './erc721.json'

import './App.css';

const nftFactoryAddress = '0xf44CD75f4613af17FFc4113070aE0D09e053382d'

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

  const connect = () => {
    window.ethereum.request({ method: 'eth_requestAccounts' }).then((accounts: string[]) => {
      setAccount(accounts[0])

      const web3Provider = new providers.Web3Provider(window.ethereum)
      const signer = web3Provider.getSigner()
      setSigner(signer)

      const nftFactoryContract = new Contract(nftFactoryAddress, nftFactoryAbi, signer)
      setNftFactory(nftFactoryContract)
    })
  }

  const deployBayc = async () => {
    const tx = await nftFactory!.createNFT('BoredApeYachtClub', 'BAYC', [
      3650, // https://opensea.io/assets/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/3650
      4671, // https://opensea.io/assets/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/4671
      3368, // https://opensea.io/assets/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/3368
    ])

    setBaycDeployTx(tx)

    const receipt: ContractReceipt = await tx.wait()

    setBaycDeployTxSuccess(true)

    const address = receipt.events![0].args!.contractAddress

    const baycContract = new Contract(address, erc721Abi, signer)
    setBayc(baycContract)

    localStorage.setItem('bayc-address', address)
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
          <button onClick={deployBayc}>deploy</button>
          {baycDeployTx && <p>Tx: {baycDeployTx.hash}{baycDeployTxSuccess && ' success'}</p>}
        </div>
        <div className="column">
          Fusion
        </div>
        <div className="column">
          NFT 2
        </div>
      </div>
    </div>
  );
}

export default App;

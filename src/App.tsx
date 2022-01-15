import { providers } from 'ethers';
import { useState } from 'react';
import './App.css';

declare global {
  interface Window { ethereum: any }
}

function App() {
  const [provider, setProvider] = useState<providers.Provider>()
  const [account, setAccount] = useState('')

  const connect = () => {
    window.ethereum.request({ method: 'eth_requestAccounts' }).then((accounts: string[]) => {
      console.log(accounts)
      setAccount(accounts[0])

      const web3Provider = new providers.Web3Provider(window.ethereum)
      setProvider(web3Provider)
    })
  }

  return (
    <div className="App">
      <div className='connect-wallet'>
        <button onClick={connect}>Connect wallet</button>
        <p>Account: {account}</p>
      </div>
      <div className='fusion'>
        <div className="column">
          NFT 1
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

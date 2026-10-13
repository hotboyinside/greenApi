import { useState } from 'react'
import { readEnv } from './config'
import { ChatScreen } from './features/chat/ChatScreen'
import { ConnectionForm } from './features/connection'
import { useConnection } from './features/connection/hooks'

function App() {
  const [env] = useState(readEnv)
  const { session, isConnecting, error, connect, disconnect } =
    useConnection(env)

  if (session) {
    return (
      <ChatScreen
        client={session.client}
        idInstance={session.idInstance}
        onDisconnect={disconnect}
      />
    )
  }

  return (
    <ConnectionForm
      isConnecting={isConnecting}
      error={error}
      onConnect={connect}
    />
  )
}

export default App

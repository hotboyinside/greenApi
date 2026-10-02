import { useState } from 'react'
import { readEnv } from './config'
import { ConnectionForm } from './features/connection'
import { useConnection } from './features/connection/hooks'
import { ChatScreen } from './features/chat/ChatScreen'

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

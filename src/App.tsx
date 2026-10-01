import { ConnectionForm } from './features/connection'
import { useConnection } from './features/connection/hooks'
import { ChatScreen } from './features/chat/ChatScreen'

function App() {
  const { session, isConnecting, error, connect, disconnect } = useConnection(
    import.meta.env.VITE_GREEN_API_URL,
  )

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

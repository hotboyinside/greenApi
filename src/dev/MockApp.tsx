import { useState } from 'react'
import { ChatScreen } from '../features/chat/ChatScreen'
import { createMockApiClient } from './createMockApiClient'

export function MockApp() {
  const [client, setClient] = useState(createMockApiClient)

  return (
    <ChatScreen
      key={client.idInstance}
      client={client.api}
      idInstance={client.idInstance}
      onDisconnect={() => {
        client.api.dispose()
        setClient(createMockApiClient())
      }}
    />
  )
}

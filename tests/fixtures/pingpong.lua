-- Ping-Pong Handler Module
-- This module demonstrates a simple ping-pong message exchange between AO processes

-- Handler to initiate a ping to another process
-- Triggered when a message includes a "Ping-Process-Id" tag
Handlers.add(
  "InitiatePing",
  Handlers.utils.hasMatchingTag("Action", "Initiate-Ping"),
  function(msg)
    local targetProcessId = msg.Tags["Ping-Process-Id"]
    
    if not targetProcessId then
      print("Error: Ping-Process-Id tag is required")
      return
    end
    
    print("Initiating ping to process: " .. targetProcessId)
    
    -- Send a ping message to the target process
    Send({
      Target = targetProcessId,
      Action = "Ping",
      Data = "ping",
      ["Sender-Process"] = ao.id
    })
    
    print("Ping sent to " .. targetProcessId)
  end
)

-- Handler to respond to incoming ping messages
-- When this process receives a "Ping" action, it sends back a "Pong"
Handlers.add(
  "RespondToPing",
  Handlers.utils.hasMatchingTag("Action", "Ping"),
  function(msg)
    local senderProcess = msg.Tags["Sender-Process"] or msg.From
    
    print("Received ping from: " .. senderProcess)
    
    -- Send a pong message back to the sender
    Send({
      Target = senderProcess,
      Action = "Pong",
      Data = "pong",
      ["Original-Sender"] = senderProcess
    })
    
    print("Pong sent back to " .. senderProcess)
  end
)

-- Handler to receive pong responses
-- This confirms the ping-pong cycle completed successfully
Handlers.add(
  "ReceivePong",
  Handlers.utils.hasMatchingTag("Action", "Pong"),
  function(msg)
    local originalSender = msg.Tags["Original-Sender"] or msg.From
    
    print("Received pong from: " .. msg.From)
    print("Ping-pong cycle completed successfully!")
    
    -- Optionally, send a confirmation message or notification
    ao.send({
      Target = ao.id,
      Action = "Ping-Pong-Complete",
      Data = "Ping-pong cycle with " .. msg.From .. " completed"
    })
  end
)

print("Ping-Pong handlers loaded successfully!")


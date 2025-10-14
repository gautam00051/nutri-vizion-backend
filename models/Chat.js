import mongoose from 'mongoose'

const chatSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'participants.userType',
      required: true
    },
    userType: {
      type: String,
      enum: ['User', 'Nutritionist'],
      required: true
    },
    name: String,
    lastRead: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Related Appointment (if any)
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  
  // Messages
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'messages.senderType',
      required: true
    },
    senderType: {
      type: String,
      enum: ['User', 'Nutritionist'],
      required: true
    },
    senderName: String,
    content: {
      type: String,
      required: [true, 'Message content is required']
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'voice'],
      default: 'text'
    },
    
    // File attachments
    attachments: [{
      filename: String,
      path: String,
      size: Number,
      mimeType: String
    }],
    
    // Message Status
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    
    // Timestamps
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Chat Status
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked'],
    default: 'active'
  },
  
  // Last Activity
  lastMessage: {
    content: String,
    timestamp: Date,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'lastMessage.senderType'
    },
    senderType: {
      type: String,
      enum: ['User', 'Nutritionist']
    }
  },
  
  // Unread Count per participant
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Update timestamps and last message
chatSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  
  // Update last message
  if (this.messages && this.messages.length > 0) {
    const lastMsg = this.messages[this.messages.length - 1]
    this.lastMessage = {
      content: lastMsg.content,
      timestamp: lastMsg.timestamp,
      sender: lastMsg.sender,
      senderType: lastMsg.senderType
    }
  }
  
  next()
})

const Chat = mongoose.model('Chat', chatSchema)

export default Chat
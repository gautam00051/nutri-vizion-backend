import express from 'express'
import Chat from '../models/Chat.js'
import User from '../models/User.js'
import Nutritionist from '../models/Nutritionist.js'
import Appointment from '../models/Appointment.js'
import auth from '../middleware/auth.js'

const router = express.Router()

// Initiate chat between patient and nutritionist (appointment-based)
router.post('/initiate', auth, async (req, res) => {
  try {
    const { appointmentId } = req.body
    const userId = req.user.id

    // Find the appointment and verify user access
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      $or: [
        { patientId: userId },
        { nutritionistId: userId }
      ],
      approvalStatus: 'approved',
      communicationEnabled: true
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or communication not enabled'
      })
    }

    // Check if chat already exists for this appointment
    let existingChat = await Chat.findOne({
      appointmentId: appointment._id,
      status: 'active'
    })

    if (existingChat) {
      return res.json({
        success: true,
        message: 'Chat session already exists',
        chat: existingChat
      })
    }

    // Create new chat session
    const newChat = new Chat({
      participants: [
        {
          user: appointment.patientId,
          userType: 'User',
          lastRead: new Date()
        },
        {
          user: appointment.nutritionistId,
          userType: 'Nutritionist',
          lastRead: new Date()
        }
      ],
      appointmentId: appointment._id,
      status: 'active'
    })

    await newChat.save()

    // Update appointment with chat session ID
    appointment.chatSessionId = newChat._id
    await appointment.save()

    // Populate chat with user details
    const populatedChat = await Chat.findById(newChat._id)
      .populate('patientId', 'firstName lastName username')
      .populate('nutritionistId', 'firstName lastName username')

    res.status(201).json({
      success: true,
      message: 'Chat initiated successfully',
      chat: populatedChat
    })
  } catch (error) {
    console.error('Error initiating chat:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to initiate chat',
      error: error.message
    })
  }
})

// Get all chats for current user
router.get('/list', auth, async (req, res) => {
  try {
    const userId = req.user.id
    const userType = req.user.userType || 'patient'

    let query = {}
    if (userType === 'patient') {
      query.patientId = userId
    } else if (userType === 'nutritionist') {
      query.nutritionistId = userId
    }

    const chats = await Chat.find(query)
      .populate('patientId', 'firstName lastName username')
      .populate('nutritionistId', 'firstName lastName username')
      .sort({ updatedAt: -1 })

    res.json({
      success: true,
      chats,
      count: chats.length
    })
  } catch (error) {
    console.error('Error fetching chats:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chats',
      error: error.message
    })
  }
})

// Get messages for a specific chat
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params
    const userId = req.user.id
    const { page = 1, limit = 50 } = req.query

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId)
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      })
    }

    if (chat.patientId.toString() !== userId && chat.nutritionistId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    // Get messages with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const messages = chat.messages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + parseInt(limit))
      .reverse() // Show oldest first in the response

    res.json({
      success: true,
      messages,
      chatInfo: {
        _id: chat._id,
        patientId: chat.patientId,
        nutritionistId: chat.nutritionistId,
        status: chat.status,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      },
      pagination: {
        current: parseInt(page),
        hasMore: chat.messages.length > skip + parseInt(limit)
      }
    })
  } catch (error) {
    console.error('Error fetching chat messages:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    })
  }
})

// Send message in chat
router.post('/:chatId/message', auth, async (req, res) => {
  try {
    const { chatId } = req.params
    const { message, messageType = 'text' } = req.body
    const senderId = req.user.id
    const senderType = req.user.userType || 'patient'

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      })
    }

    // Find and verify chat
    const chat = await Chat.findById(chatId)
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      })
    }

    // Verify user has access to this chat
    if (chat.patientId.toString() !== senderId && chat.nutritionistId.toString() !== senderId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    // Create new message
    const newMessage = {
      senderId,
      senderType,
      message: message.trim(),
      messageType,
      createdAt: new Date(),
      isRead: false
    }

    // Add message to chat
    chat.messages.push(newMessage)
    chat.updatedAt = new Date()
    chat.lastMessage = {
      message: message.trim(),
      senderId,
      senderType,
      createdAt: new Date()
    }

    await chat.save()

    // Get the saved message (with generated ID)
    const savedMessage = chat.messages[chat.messages.length - 1]

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      messageData: savedMessage
    })
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    })
  }
})

// Mark messages as read
router.put('/:chatId/read', auth, async (req, res) => {
  try {
    const { chatId } = req.params
    const userId = req.user.id

    const chat = await Chat.findById(chatId)
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      })
    }

    // Verify user has access to this chat
    if (chat.patientId.toString() !== userId && chat.nutritionistId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    // Mark all messages from other user as read
    let updatedCount = 0
    chat.messages.forEach(message => {
      if (message.senderId.toString() !== userId && !message.isRead) {
        message.isRead = true
        updatedCount++
      }
    })

    if (updatedCount > 0) {
      await chat.save()
    }

    res.json({
      success: true,
      message: `${updatedCount} messages marked as read`
    })
  } catch (error) {
    console.error('Error marking messages as read:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message
    })
  }
})

// Get unread message count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.id
    const userType = req.user.userType || 'patient'

    let query = {}
    if (userType === 'patient') {
      query.patientId = userId
    } else if (userType === 'nutritionist') {
      query.nutritionistId = userId
    }

    const chats = await Chat.find(query)
    let totalUnreadCount = 0

    chats.forEach(chat => {
      const unreadCount = chat.messages.filter(message => 
        message.senderId.toString() !== userId && !message.isRead
      ).length
      totalUnreadCount += unreadCount
    })

    res.json({
      success: true,
      unreadCount: totalUnreadCount
    })
  } catch (error) {
    console.error('Error getting unread count:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    })
  }
})

// Delete chat
router.delete('/:chatId', auth, async (req, res) => {
  try {
    const { chatId } = req.params
    const userId = req.user.id

    const chat = await Chat.findById(chatId)
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      })
    }

    // Verify user has access to this chat
    if (chat.patientId.toString() !== userId && chat.nutritionistId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    // Soft delete - just mark as inactive
    chat.status = 'inactive'
    await chat.save()

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting chat:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete chat',
      error: error.message
    })
  }
})

// @route   GET /api/chat/appointment/:appointmentId
// @desc    Get chat messages for an appointment
// @access  Private (Patient or Nutritionist involved in appointment)
router.get('/appointment/:appointmentId', auth, async (req, res) => {
  try {
    const { appointmentId } = req.params
    const userId = req.user.id
    const { page = 1, limit = 50 } = req.query

    // Verify user has access to this appointment
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      $or: [
        { patientId: userId },
        { nutritionistId: userId }
      ]
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or access denied'
      })
    }

    // Get chat session
    const chat = await Chat.findOne({ appointmentId })
      .populate('participants.user', 'name email profilePicture')

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      })
    }

    // Get messages with pagination
    const messages = chat.messages
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice((page - 1) * limit, page * limit)
      .reverse() // Return in chronological order

    // Mark messages as read
    const unreadMessages = chat.messages.filter(msg => 
      msg.sender.toString() !== userId && !msg.isRead
    )
    
    unreadMessages.forEach(msg => {
      msg.isRead = true
      msg.readAt = new Date()
    })

    if (unreadMessages.length > 0) {
      await chat.save()
    }

    res.json({
      success: true,
      chat: {
        _id: chat._id,
        appointmentId: chat.appointmentId,
        participants: chat.participants,
        status: chat.status
      },
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: chat.messages.length,
        hasMore: page * limit < chat.messages.length
      }
    })
  } catch (error) {
    console.error('Get appointment chat error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching chat messages'
    })
  }
})

// @route   POST /api/chat/appointment/:appointmentId/message
// @desc    Send a message in appointment chat
// @access  Private (Patient or Nutritionist involved in appointment)
router.post('/appointment/:appointmentId/message', auth, async (req, res) => {
  try {
    const { appointmentId } = req.params
    const { content, messageType = 'text' } = req.body
    const userId = req.user.id

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      })
    }

    // Verify user has access to this appointment
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      $or: [
        { patientId: userId },
        { nutritionistId: userId }
      ],
      communicationEnabled: true
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or communication not enabled'
      })
    }

    // Get chat session
    let chat = await Chat.findOne({ appointmentId })
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      })
    }

    // Determine sender type
    const senderType = appointment.patientId.toString() === userId ? 'User' : 'Nutritionist'
    const senderName = senderType === 'User' ? 
      (await User.findById(userId)).name : 
      (await Nutritionist.findById(userId)).name

    // Create message
    const newMessage = {
      sender: userId,
      senderType,
      senderName,
      content: content.trim(),
      messageType,
      timestamp: new Date(),
      isRead: false
    }

    chat.messages.push(newMessage)
    
    // Update last message
    chat.lastMessage = {
      content: content.trim(),
      timestamp: new Date(),
      sender: userId,
      senderType
    }

    await chat.save()

    // Get the saved message
    const savedMessage = chat.messages[chat.messages.length - 1]

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      messageData: savedMessage
    })
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while sending message'
    })
  }
})

// @route   GET /api/chat/user/conversations
// @desc    Get all chat conversations for a user
// @access  Private
router.get('/user/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id
    
    // Simple response for now to test
    res.json({
      success: true,
      conversations: [],
      message: 'Chat conversations endpoint working'
    })
    
    // TODO: Implement full conversation loading when needed
    
  } catch (error) {
    console.error('Get conversations error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching conversations'
    })
  }
})

export default router
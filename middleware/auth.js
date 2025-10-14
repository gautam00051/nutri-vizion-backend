import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Nutritionist from '../models/Nutritionist.js'

const auth = async (req, res, next) => {
  try {
    let token

    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      })
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      
      let user
      
      // Check if it's a nutritionist token
      if (decoded.userType === 'nutritionist') {
        user = await Nutritionist.findById(decoded.id)
        if (!user || !user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Nutritionist not found or inactive'
          })
        }
      } else {
        // Default to regular user
        user = await User.findById(decoded.id)
        if (!user || !user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'User not found or inactive'
          })
        }
      }

      req.user = user
      req.userType = decoded.userType || 'user'
      next()
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      })
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    })
  }
}

export default auth
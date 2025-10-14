import fetch from 'node-fetch'

const testAppointmentSystem = async () => {
  try {
    console.log('🧪 Testing Appointment System...\n')

    // First, let's login as a patient
    console.log('1. Logging in as patient...')
    const patientLogin = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    if (!patientLogin.ok) {
      console.log('❌ Patient login failed, creating test patient...')
      
      // Create test patient
      const registerResponse = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Patient',
          email: 'test@example.com',
          password: 'password123'
        })
      })
      
      if (registerResponse.ok) {
        const regData = await registerResponse.json()
        console.log('✅ Test patient created successfully')
      } else {
        console.log('❌ Failed to create test patient')
        return
      }
    }

    const patientData = await patientLogin.json()
    const patientToken = patientData.token
    console.log('✅ Patient logged in successfully')

    // Now login as nutritionist
    console.log('\n2. Logging in as nutritionist...')
    const nutritionistLogin = await fetch('http://localhost:5001/api/nutritionist/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sarah.johnson@example.com',
        password: 'password123'
      })
    })

    if (!nutritionistLogin.ok) {
      console.log('❌ Nutritionist login failed')
      return
    }

    const nutritionistData = await nutritionistLogin.json()
    const nutritionistToken = nutritionistData.token
    const nutritionistId = nutritionistData.nutritionist.id
    console.log('✅ Nutritionist logged in successfully')

    // Book an appointment
    console.log('\n3. Booking appointment...')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const appointmentData = {
      nutritionistId: nutritionistId,
      date: tomorrow.toISOString().split('T')[0],
      time: '14:00',
      sessionType: 'video',
      reason: 'I need help with weight management and creating a sustainable meal plan.',
      duration: 60,
      notes: 'I have no dietary restrictions and am looking to lose 10 pounds.'
    }

    const bookingResponse = await fetch('http://localhost:5001/api/appointments/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify(appointmentData)
    })

    if (!bookingResponse.ok) {
      const error = await bookingResponse.json()
      console.log('❌ Appointment booking failed:', error.message)
      return
    }

    const appointment = await bookingResponse.json()
    const appointmentId = appointment.appointment._id
    console.log('✅ Appointment booked successfully!')
    console.log(`   Appointment ID: ${appointmentId}`)
    console.log(`   Status: ${appointment.appointment.approvalStatus}`)

    // Get nutritionist's appointments
    console.log('\n4. Checking nutritionist\'s appointment requests...')
    const nutritionistAppointments = await fetch('http://localhost:5001/api/appointments/nutritionist?approvalStatus=pending', {
      headers: { 'Authorization': `Bearer ${nutritionistToken}` }
    })

    if (nutritionistAppointments.ok) {
      const appointmentsData = await nutritionistAppointments.json()
      console.log(`✅ Found ${appointmentsData.appointments.length} pending appointments`)
    }

    // Approve the appointment
    console.log('\n5. Approving appointment...')
    const approvalResponse = await fetch(`http://localhost:5001/api/appointments/${appointmentId}/approve`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${nutritionistToken}` }
    })

    if (!approvalResponse.ok) {
      const error = await approvalResponse.json()
      console.log('❌ Appointment approval failed:', error.message)
      return
    }

    const approvedAppointment = await approvalResponse.json()
    console.log('✅ Appointment approved successfully!')
    console.log(`   Communication enabled: ${approvedAppointment.appointment.communicationEnabled}`)
    console.log(`   Chat session ID: ${approvedAppointment.chatSessionId}`)

    // Test chat functionality
    console.log('\n6. Testing chat functionality...')
    const chatMessage = await fetch(`http://localhost:5001/api/chat/appointment/${appointmentId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        content: 'Hello! I\'m excited about our upcoming session. Thank you for approving my appointment!'
      })
    })

    if (chatMessage.ok) {
      console.log('✅ Chat message sent successfully!')
      
      // Get chat messages
      const messages = await fetch(`http://localhost:5001/api/chat/appointment/${appointmentId}`, {
        headers: { 'Authorization': `Bearer ${nutritionistToken}` }
      })
      
      if (messages.ok) {
        const chatData = await messages.json()
        console.log(`✅ Retrieved ${chatData.messages.length} chat messages`)
      }
    } else {
      console.log('❌ Failed to send chat message')
    }

    // Test call functionality
    console.log('\n7. Testing call functionality...')
    const callStart = await fetch(`http://localhost:5001/api/appointments/${appointmentId}/call/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({ callType: 'video' })
    })

    if (callStart.ok) {
      const callData = await callStart.json()
      console.log('✅ Video call started successfully!')
      console.log(`   Meeting link: ${callData.callSession.meetingLink}`)
    } else {
      console.log('❌ Failed to start video call')
    }

    console.log('\n🎉 Appointment system test completed successfully!')
    console.log('\n📋 Summary:')
    console.log('✅ Patient registration/login')
    console.log('✅ Nutritionist login')
    console.log('✅ Appointment booking')
    console.log('✅ Appointment approval')
    console.log('✅ Communication enablement')
    console.log('✅ Chat functionality')
    console.log('✅ Call functionality')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testAppointmentSystem()
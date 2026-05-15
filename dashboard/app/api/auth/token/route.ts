import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import path from 'path'

export async function GET() {
  try {
    dotenv.config({ path: path.resolve(process.cwd(), '../.env') })
    const secret = process.env.JWT_SECRET || 'fallback_secret'
    
    // Generate a token valid for 1 hour for the dashboard
    const token = jwt.sign(
      { sub: 'dashboard_ui', role: 'admin' }, 
      secret, 
      { expiresIn: '1h' }
    )
    
    return NextResponse.json({ token })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}

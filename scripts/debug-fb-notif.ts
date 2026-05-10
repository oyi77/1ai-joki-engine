#!/usr/bin/env ts-node
import { getNotifications } from '../src/adapters/providers/meta/facebook/facebook-notif'

async function main(): Promise<void> {
  const cookieString = process.argv[2]
  try {
    await getNotifications(cookieString, 2, false)
  } catch (e: unknown) {
    console.error(e)
  }
}
main()

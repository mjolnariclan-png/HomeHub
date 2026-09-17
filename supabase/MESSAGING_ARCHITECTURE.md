# Private Messaging Architecture

## What Supabase stores

`message_devices` stores a profile ID, random device ID, public ECDH key, and timestamps. It does not store private keys, message bodies, attachments, conversation history, or encryption keys.

## Transport

Use Supabase Realtime private Broadcast channels only for online delivery. Each family uses a channel such as `family:<family-id>:messages`.

Send payloads shaped like:

```json
{
  "messageId": "uuid",
  "conversationId": "family-wide-or-direct-id",
  "senderDeviceId": "random-device-id",
  "senderEphemeralPublicKey": { "kty": "EC", "crv": "P-256" },
  "recipientDeviceId": "random-device-id",
  "ciphertext": "base64",
  "iv": "base64",
  "sentAt": "ISO-8601"
}
```

`ciphertext` must be encrypted before calling Broadcast. Never send a plaintext `body` field.

## Encryption and local history

1. Generate a non-extractable ECDH P-256 private `CryptoKey` locally with Web Crypto.
2. Store that private key and encrypted message history in IndexedDB only.
3. Publish the matching public key JWK to `message_devices`.
4. For every recipient device, derive an AES-GCM key using ECDH and a new ephemeral sender key.
5. Broadcast a separately encrypted payload for each recipient device.
6. Decrypt only on the recipient device, then save its local copy in IndexedDB.

Browser private keys can be non-extractable, but device storage is not a substitute for an operating-system keychain. Users who clear site data lose their local message history and device identity.

## Required Supabase setup

1. Run `SUPABASE_MESSAGING_TRANSPORT.sql` in Supabase SQL Editor.
2. In Supabase Dashboard, enable Realtime Broadcast and Presence.
3. Configure Realtime Authorization so only authenticated users whose `profiles.family_id` matches the channel family UUID can subscribe and broadcast to that private channel.
4. Do not create a `messages` table, a message-body column, or a database trigger that logs message content.
5. Confirm in Database Tables that only `message_devices` exists for this feature.
6. Inspect Realtime/network payloads during testing and confirm only encrypted payloads are transmitted.

## Offline behavior

Realtime Broadcast does not persist messages. A recipient who is offline cannot receive the message later under this design. Do not silently fall back to Supabase plaintext storage.

Reliable offline delivery requires a separate relay with a short retention policy for encrypted envelopes only, plus delivery acknowledgements and deletion after acknowledgement. The relay must never receive plaintext or private keys.

## Verification checklist

- A family member can read another member's public key but cannot insert, update, or revoke it.
- A user outside the family cannot read device keys.
- Network payloads contain ciphertext and IV only, never readable message text.
- Reloading a device restores that device's local IndexedDB history.
- Clearing site data removes only that device's local history and keys.
- An offline recipient does not receive an invented queued message.

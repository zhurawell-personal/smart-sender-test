
const FINGERPRINT_KEY = 'fingerprint' // key for localStorage

export function getFingerprint(): string {
  const savedFingerprint = localStorage.getItem(FINGERPRINT_KEY)

  // if present and valid, return the saved fingerprint
  if (savedFingerprint && /^[a-f\d]{32}$/i.test(savedFingerprint)) {
    return savedFingerprint
  }

  // otherwise, generate a new fingerprint and save it
  const fingerprint = crypto.randomUUID().replaceAll('-', '')

  localStorage.setItem(FINGERPRINT_KEY, fingerprint)
  return fingerprint
}

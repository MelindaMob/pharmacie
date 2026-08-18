import twilio from 'twilio'

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

export async function envoyerSms(numeroDestination: string, message: string) {
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: numeroDestination,
    })
    return { success: true }
  } catch (error) {
    console.error('Erreur envoi SMS:', error)
    return { success: false, error }
  }
}

export function normaliserNumeroFrancais(numero: string) {
  const nettoye = numero.replace(/[\s.-]/g, '')
  if (nettoye.startsWith('0')) return '+33' + nettoye.slice(1)
  if (nettoye.startsWith('+')) return nettoye
  return '+33' + nettoye
}

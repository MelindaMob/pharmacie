'use client'

import Messagerie from '@/components/Messagerie'

export default function DetailReservation({
  reservationId,
  clientNom,
  onClose,
}: {
  reservationId: string
  clientNom: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">RDV — {clientNom}</h2>
          <button type="button" onClick={onClose} className="text-gray-500">
            ✕
          </button>
        </div>
        <Messagerie reservationId={reservationId} role="pharmacie" />
      </div>
    </div>
  )
}

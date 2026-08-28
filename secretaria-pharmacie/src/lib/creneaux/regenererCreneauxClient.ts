export async function regenererCreneauxClient(pharmacieId: string): Promise<number> {
  const res = await fetch('/api/generer-creneaux', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pharmacieId }),
  })
  const data = await res.json()
  if (!res.ok || !data.success) {
    const err =
      typeof data.error === 'string'
        ? data.error
        : data.error?.message ?? 'Erreur lors de la génération des créneaux'
    throw new Error(err)
  }
  return data.count as number
}

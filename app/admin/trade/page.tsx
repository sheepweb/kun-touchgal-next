import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ErrorComponent } from '~/components/error/ErrorComponent'
import { Trade } from '~/components/admin/trade/Container'
import { kunMetadata } from './metadata'
import { kunGetActions } from './actions'

export const revalidate = 3

export const metadata: Metadata = kunMetadata

export default async function Kun() {
  const response = await kunGetActions({
    page: 1,
    limit: 30,
    tab: 'purchase'
  })
  if (typeof response === 'string') {
    return <ErrorComponent error={response} />
  }

  return (
    <Suspense>
      <Trade
        initialTrades={response.trades}
        initialTotal={response.total}
        initialTab="purchase"
      />
    </Suspense>
  )
}

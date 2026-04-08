import { Suspense } from 'react'
import { ErrorComponent } from '~/components/error/ErrorComponent'
import { UserDownload } from '~/components/user/download/Container'
import { kunGetActions } from './actions'

export const revalidate = 3

interface Props {
  params: Promise<{ id: string }>
}

export default async function Kun({ params }: Props) {
  const { id } = await params

  const response = await kunGetActions({
    uid: Number(id),
    page: 1,
    limit: 20
  })
  if (typeof response === 'string') {
    return <ErrorComponent error={response} />
  }

  return (
    <Suspense>
      <UserDownload
        initialLogs={response.logs}
        total={response.total}
        uid={Number(id)}
      />
    </Suspense>
  )
}

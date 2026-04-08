import { Chip } from '@heroui/chip'
import { Card, CardBody } from '@heroui/card'
import { Image } from '@heroui/image'
import Link from 'next/link'
import {
  RESOURCE_ACCESS_STATUS_COLOR_MAP,
  RESOURCE_ACCESS_STATUS_MAP
} from '~/constants/currency'
import { SUPPORTED_RESOURCE_LINK_MAP } from '~/constants/resource'
import { formatDate, formatTimeDifference } from '~/utils/time'
import type { UserResourceDownloadLog } from '~/types/api/user'

interface Props {
  log: UserResourceDownloadLog
}

export const UserDownloadCard = ({ log }: Props) => {
  const bannerImageSrc = log.patchBanner
    ? log.patchBanner.replace(/\.avif$/, '-mini.avif')
    : '/touchgal.avif'

  return (
    <Card className="w-full">
      <CardBody className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href={`/${log.patchUniqueId}`}
            className="relative w-full sm:h-auto sm:w-40"
          >
            <Image
              src={bannerImageSrc}
              alt={log.patchName}
              className="object-cover rounded-lg size-full max-h-52"
              radius="lg"
            />
          </Link>

          <div className="flex-1 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <Link
                  href={`/${log.patchUniqueId}`}
                  className="text-lg font-semibold transition-colors line-clamp-2 hover:text-primary-500"
                >
                  {log.patchName}
                </Link>
                <p className="text-sm text-default-500">
                  资源: {log.resourceName}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip variant="flat">
                  {SUPPORTED_RESOURCE_LINK_MAP[log.storage] ?? log.storage}
                </Chip>
                <Chip
                  color={
                    RESOURCE_ACCESS_STATUS_COLOR_MAP[log.accessStatus] ??
                    'default'
                  }
                  variant="flat"
                >
                  {RESOURCE_ACCESS_STATUS_MAP[log.accessStatus] ??
                    log.accessStatus}
                </Chip>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Chip variant="light">
                下载于 {formatTimeDifference(log.downloadedAt)}
              </Chip>
            </div>

            <div className="space-y-1 text-sm text-default-500">
              <p>
                下载时间:{' '}
                {formatDate(log.downloadedAt, {
                  isShowYear: true,
                  isPrecise: true
                })}
              </p>

              {log.accessStartedAt ? (
                <p>
                  当次授权开始:{' '}
                  {formatDate(log.accessStartedAt, {
                    isShowYear: true,
                    isPrecise: true
                  })}
                </p>
              ) : (
                <p>当次授权开始: 首次下载后开始计时</p>
              )}

              {log.accessExpiresAt ? (
                <p>
                  当次授权到期:{' '}
                  {formatDate(log.accessExpiresAt, {
                    isShowYear: true,
                    isPrecise: true
                  })}
                </p>
              ) : (
                <p>当次授权到期: 永久有效</p>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

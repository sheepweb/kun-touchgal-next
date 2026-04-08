'use client'

import { useState } from 'react'
import { Chip } from '@heroui/chip'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Snippet } from '@heroui/snippet'
import { Image } from '@heroui/image'
import { useRouter } from '@bprogress/next'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  RESOURCE_ACCESS_EXPIRE_MODE_MAP,
  RESOURCE_ACCESS_STATUS_COLOR_MAP,
  RESOURCE_ACCESS_STATUS_MAP,
  SUPPORTED_CURRENCY_CODE_MAP
} from '~/constants/currency'
import { SUPPORTED_RESOURCE_LINK_MAP } from '~/constants/resource'
import { KunExternalLink } from '~/components/kun/external-link/ExternalLink'
import { kunFetchPost, kunFetchPut } from '~/utils/kunFetch'
import { kunErrorHandler } from '~/utils/kunErrorHandler'
import { formatDate, formatTimeDifference } from '~/utils/time'
import type {
  PatchResourceDownloadPayload,
  PatchResourcePurchaseResult
} from '~/types/api/patch'
import type { UserPurchasedResource } from '~/types/api/user'

interface Props {
  resource: UserPurchasedResource
  onUpdated: () => void
}

const getDownloadButtonText = (resource: UserPurchasedResource) => {
  if (resource.accessStatus === 'not_started') {
    return '首次下载并开始计时'
  }

  return resource.downloadCount > 0 ? '继续下载' : '获取下载地址'
}

export const UserPurchaseCard = ({ resource, onUpdated }: Props) => {
  const router = useRouter()
  const bannerImageSrc = resource.patchBanner
    ? resource.patchBanner.replace(/\.avif$/, '-mini.avif')
    : '/touchgal.avif'
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [downloadPayload, setDownloadPayload] =
    useState<PatchResourceDownloadPayload | null>(null)

  const handleLogin = () => {
    router.push('/login')
  }

  const handleDownload = async () => {
    if (downloadLoading || purchaseLoading) {
      return
    }

    setDownloadLoading(true)
    const res = await kunFetchPut<KunResponse<PatchResourceDownloadPayload>>(
      '/patch/resource/download',
      {
        patchId: resource.patchId,
        resourceId: resource.resourceId
      }
    )
    setDownloadLoading(false)

    if (typeof res === 'string') {
      kunErrorHandler<PatchResourceDownloadPayload>(res, () => undefined)
      if (res === '用户未登录' || res === '用户登陆失效') {
        handleLogin()
      }
      return
    }

    setDownloadPayload(res)
    toast.success('已获取真实下载地址')
    onUpdated()
  }

  const handleRenew = async () => {
    if (purchaseLoading) {
      return
    }

    setPurchaseLoading(true)
    setDownloadPayload(null)
    const res = await kunFetchPost<KunResponse<PatchResourcePurchaseResult>>(
      '/patch/resource/purchase',
      {
        resourceId: resource.resourceId
      }
    )
    setPurchaseLoading(false)

    if (typeof res === 'string') {
      kunErrorHandler<PatchResourcePurchaseResult>(res, () => undefined)
      if (res === '用户未登录' || res === '用户登陆失效') {
        handleLogin()
      }
      return
    }

    toast.success(
      res.purchaseAction === 'renewed'
        ? '续费成功, 您现在可以重新获取真实下载地址了'
        : '购买成功, 您现在可以获取真实下载地址了'
    )
    onUpdated()
  }

  const resourceLinks = (downloadPayload?.content ?? '')
    .split(',')
    .map((link) => link.trim())
    .filter(Boolean)

  return (
    <Card className="w-full">
      <CardBody className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href={`/${resource.patchUniqueId}`}
            className="relative w-full sm:h-auto sm:w-40"
          >
            <Image
              src={bannerImageSrc}
              alt={resource.patchName}
              className="object-cover rounded-lg size-full max-h-52"
              radius="lg"
            />
          </Link>

          <div className="flex-1 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <Link
                  href={`/${resource.patchUniqueId}`}
                  className="text-lg font-semibold transition-colors line-clamp-2 hover:text-primary-500"
                >
                  {resource.patchName}
                </Link>
                <p className="text-sm text-default-500">
                  资源: {resource.resourceName}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip color="primary" variant="flat">
                  {resource.price}{' '}
                  {SUPPORTED_CURRENCY_CODE_MAP[resource.currencyCode] ??
                    resource.currencyCode}
                </Chip>
                <Chip
                  color={
                    RESOURCE_ACCESS_STATUS_COLOR_MAP[resource.accessStatus] ??
                    'default'
                  }
                  variant="flat"
                >
                  {RESOURCE_ACCESS_STATUS_MAP[resource.accessStatus] ??
                    resource.accessStatus}
                </Chip>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Chip variant="light">
                {SUPPORTED_RESOURCE_LINK_MAP[resource.storage] ??
                  resource.storage}
              </Chip>
              <Chip variant="light">
                授权方式:{' '}
                {RESOURCE_ACCESS_EXPIRE_MODE_MAP[resource.accessExpireMode] ??
                  resource.accessExpireMode}
              </Chip>
              <Chip variant="light">下载次数 {resource.downloadCount}</Chip>
              <Chip variant="light">
                购买于 {formatTimeDifference(resource.purchasedAt)}
              </Chip>
            </div>

            <div className="space-y-1 text-sm text-default-500">
              <p>
                购买时间:{' '}
                {formatDate(resource.purchasedAt, {
                  isShowYear: true,
                  isPrecise: true
                })}
              </p>

              {resource.downloadedAt && (
                <p>
                  最近下载:{' '}
                  {formatDate(resource.downloadedAt, {
                    isShowYear: true,
                    isPrecise: true
                  })}
                </p>
              )}

              {!resource.downloadedAt && <p>最近下载: 尚未下载</p>}

              <p>
                授权时长:{' '}
                {resource.accessDurationDays
                  ? `${resource.accessDurationDays} 天`
                  : resource.accessExpireMode === 'never'
                    ? '永久有效'
                    : '首次下载后开始计时'}
              </p>

              {resource.accessStartedAt && (
                <p>
                  授权开始:{' '}
                  {formatDate(resource.accessStartedAt, {
                    isShowYear: true,
                    isPrecise: true
                  })}
                </p>
              )}

              {!resource.accessStartedAt &&
                resource.accessStatus === 'not_started' && (
                  <p>授权开始: 首次下载后开始计时</p>
                )}

              {resource.accessExpiresAt && (
                <p>
                  授权到期:{' '}
                  {formatDate(resource.accessExpiresAt, {
                    isShowYear: true,
                    isPrecise: true
                  })}
                </p>
              )}

              {!resource.accessExpiresAt &&
                resource.accessStatus === 'not_started' && (
                  <p>授权到期: 首次下载后开始计时后计算</p>
                )}

              {!resource.accessExpiresAt &&
                resource.accessStatus !== 'not_started' && (
                  <p>授权到期: 永久有效</p>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                as={Link}
                href={`/${resource.patchUniqueId}`}
                color="default"
                variant="flat"
              >
                前往资源页
              </Button>

              {resource.canDownload && resource.accessStatus !== 'expired' && (
                <Button
                  color="primary"
                  variant="flat"
                  isLoading={downloadLoading}
                  onPress={handleDownload}
                >
                  {getDownloadButtonText(resource)}
                </Button>
              )}

              {resource.accessStatus === 'expired' && (
                <Button
                  color="danger"
                  variant="flat"
                  isLoading={purchaseLoading}
                  onPress={handleRenew}
                >
                  重新购买并续期
                </Button>
              )}
            </div>

            {!!downloadPayload && (
              <div className="space-y-2 rounded-large border border-default-200 p-3">
                <p className="text-sm text-default-500">
                  当前会话已获取真实下载信息
                </p>

                {resourceLinks.map((link) => (
                  <div key={link} className="space-y-2">
                    <KunExternalLink underline="always" link={link}>
                      {link}
                    </KunExternalLink>

                    {downloadPayload.storage === 's3' &&
                      downloadPayload.hash && (
                        <Snippet
                          symbol="校验码"
                          className="flex overflow-auto whitespace-normal"
                        >
                          {downloadPayload.hash}
                        </Snippet>
                      )}
                  </div>
                ))}

                <div className="flex flex-wrap gap-2">
                  {downloadPayload.code && (
                    <Snippet symbol="提取码" className="py-0" color="primary">
                      {downloadPayload.code}
                    </Snippet>
                  )}

                  {downloadPayload.password && (
                    <Snippet symbol="解压码" className="py-0" color="primary">
                      {downloadPayload.password}
                    </Snippet>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

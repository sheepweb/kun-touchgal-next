'use client'

import { useState } from 'react'
import { useRouter } from '@bprogress/next'
import { Button } from '@heroui/button'
import { Snippet } from '@heroui/snippet'
import { Chip } from '@heroui/chip'
import { Cloud, Database, Link as LinkIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { Microsoft } from '~/components/kun/icons/Microsoft'
import { KunExternalLink } from '~/components/kun/external-link/ExternalLink'
import {
  RESOURCE_ACCESS_EXPIRE_MODE_MAP,
  RESOURCE_ACCESS_STATUS_COLOR_MAP,
  RESOURCE_ACCESS_STATUS_MAP,
  SUPPORTED_CURRENCY_CODE_MAP
} from '~/constants/currency'
import { SUPPORTED_RESOURCE_LINK_MAP } from '~/constants/resource'
import { kunFetchPost, kunFetchPut } from '~/utils/kunFetch'
import { kunErrorHandler } from '~/utils/kunErrorHandler'
import type { JSX } from 'react'
import type {
  PatchResource,
  PatchResourceDownloadPayload,
  PatchResourceLink,
  PatchResourcePurchaseResult
} from '~/types/api/patch'

const storageIcons: { [key: string]: JSX.Element } = {
  touchgal: <Database className="size-4" />,
  s3: <Cloud className="size-4" />,
  onedrive: <Microsoft className="size-4" />,
  user: <LinkIcon className="size-4" />
}

interface Props {
  resource: PatchResource
  link: PatchResourceLink
}

export const ResourceDownloadCard = ({ resource, link }: Props) => {
  const router = useRouter()
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchaseResult, setPurchaseResult] =
    useState<PatchResourcePurchaseResult | null>(null)
  const [downloadPayload, setDownloadPayload] =
    useState<PatchResourceDownloadPayload | null>(null)

  const currentSale = purchaseResult?.sale ?? resource.sale
  const currentAccessStatus =
    downloadPayload?.accessStatus ??
    purchaseResult?.accessStatus ??
    resource.accessStatus
  const currentCanDownload = purchaseResult?.canDownload ?? resource.canDownload
  const currentAccessExpiresAt =
    downloadPayload?.accessExpiresAt ??
    purchaseResult?.accessExpiresAt ??
    resource.accessExpiresAt

  const handleLogin = () => {
    router.push('/login')
  }

  const handlePurchase = async () => {
    if (purchaseLoading) {
      return
    }

    setPurchaseLoading(true)
    setDownloadPayload(null)
    const res = await kunFetchPost<KunResponse<PatchResourcePurchaseResult>>(
      '/patch/resource/purchase',
      {
        resourceId: resource.id
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

    setPurchaseResult(res)
    toast.success(res.purchaseAction === 'renewed' ? '续费成功' : '购买成功')
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
        resourceId: resource.id,
        linkId: link.id
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
    toast.success('已获取真实下载信息')
  }

  return (
    <div className="flex flex-col space-y-3 rounded-large border border-default-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          color="secondary"
          variant="flat"
          startContent={storageIcons[link.storage]}
        >
          {SUPPORTED_RESOURCE_LINK_MAP[link.storage] ?? link.storage}
        </Chip>
        <Chip variant="flat" startContent={<Database className="w-4 h-4" />}>
          {link.size}
        </Chip>
        <Chip
          color={
            RESOURCE_ACCESS_STATUS_COLOR_MAP[currentAccessStatus] ?? 'default'
          }
          variant="flat"
        >
          {RESOURCE_ACCESS_STATUS_MAP[currentAccessStatus] ??
            currentAccessStatus}
        </Chip>
        {currentSale && (
          <Chip color="primary" variant="flat">
            {currentSale.price}{' '}
            {SUPPORTED_CURRENCY_CODE_MAP[currentSale.currencyCode] ??
              currentSale.currencyCode}
          </Chip>
        )}
        {currentSale && (
          <Chip variant="light">
            {RESOURCE_ACCESS_EXPIRE_MODE_MAP[currentSale.accessExpireMode] ??
              currentSale.accessExpireMode}
          </Chip>
        )}
      </div>

      {currentAccessStatus === 'guest' && (
        <>
          <p className="text-sm text-default-500">
            登录后可查看并获取该资源下载信息
          </p>
          <Button color="primary" variant="flat" onPress={handleLogin}>
            登录后继续
          </Button>
        </>
      )}

      {currentAccessStatus === 'not_purchased' && (
        <>
          <p className="text-sm text-default-500">
            该资源为付费资源，请先购买后再获取真实下载信息。
          </p>
          <Button
            color="primary"
            variant="flat"
            isLoading={purchaseLoading}
            onPress={handlePurchase}
          >
            购买资源
          </Button>
        </>
      )}

      {currentAccessStatus === 'expired' && (
        <>
          <p className="text-sm text-danger-500">
            当前授权已失效，请重新购买以恢复下载权限。
          </p>
          <Button
            color="danger"
            variant="flat"
            isLoading={purchaseLoading}
            onPress={handlePurchase}
          >
            重新购买
          </Button>
        </>
      )}

      {currentCanDownload && currentAccessStatus !== 'expired' && (
        <div className="space-y-2">
          <p className="text-sm text-default-500">
            {currentAccessExpiresAt
              ? `当前授权有效期至 ${currentAccessExpiresAt}`
              : currentAccessStatus === 'not_started'
                ? '首次下载后将开始计时'
                : '点击下方按钮获取真实下载信息'}
          </p>

          <Button
            color="primary"
            variant="flat"
            isLoading={downloadLoading}
            onPress={handleDownload}
          >
            {currentAccessStatus === 'not_started'
              ? '首次下载并开始计时'
              : '获取真实下载信息'}
          </Button>

          {downloadPayload && (
            <div className="space-y-2 rounded-large bg-default-50 p-3">
              <KunExternalLink
                className="break-all"
                underline="always"
                link={downloadPayload.content}
              >
                {downloadPayload.content}
              </KunExternalLink>

              <div className="flex flex-wrap gap-2">
                {downloadPayload.code && (
                  <Snippet
                    tooltipProps={{ content: '点击复制提取码' }}
                    size="sm"
                    symbol="提取码"
                    color="primary"
                    className="py-0"
                  >
                    {downloadPayload.code}
                  </Snippet>
                )}

                {downloadPayload.password && (
                  <Snippet
                    tooltipProps={{ content: '点击复制解压码' }}
                    size="sm"
                    symbol="解压码"
                    color="primary"
                    className="py-0"
                  >
                    {downloadPayload.password}
                  </Snippet>
                )}
              </div>

              {downloadPayload.storage === 's3' && downloadPayload.hash && (
                <>
                  <p className="text-sm">
                    BLACK3 校验码 (您可以根据此校验码校验下载文件完整性)
                  </p>
                  <Snippet
                    symbol=""
                    className="flex overflow-auto whitespace-normal"
                  >
                    {downloadPayload.hash}
                  </Snippet>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

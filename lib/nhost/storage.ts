'use client'

import { nhost } from './client'
import type { NhostClient } from '@nhost/nextjs'

/**
 * Upload a file to Nhost Storage
 */
export async function uploadFile(
  file: File,
  bucket: 'avatars' | 'knowledge-documents' | 'lab-snapshots',
  path?: string
): Promise<{ fileId: string; filePath: string }> {
  const filePath = path || `${Date.now()}-${file.name}`

  const { fileMetadata, error } = await nhost.storage.upload({
    file,
    bucketId: bucket,
    name: filePath,
  })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  return {
    fileId: fileMetadata?.id || '',
    filePath: fileMetadata?.name || filePath,
  }
}

/**
 * Delete a file from Nhost Storage
 */
export async function deleteFile(bucket: string, filePath: string): Promise<void> {
  const { error } = await nhost.storage.delete({
    fileId: filePath,
  })

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}

/**
 * Get public URL for a file
 */
export function getFileUrl(bucket: string, filePath: string): string {
  return nhost.storage.getPublicUrl({
    fileId: filePath,
  })
}

/**
 * Get signed URL for private file (expires after specified seconds)
 */
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const { presignedUrl, error } = await nhost.storage.getPresignedUrl({
    fileId: filePath,
  })

  if (error) {
    throw new Error(`Failed to get presigned URL: ${error.message}`)
  }

  return presignedUrl?.url || ''
}

/**
 * Upload avatar image
 */
export async function uploadAvatarImage(file: File, userId: string): Promise<string> {
  const path = `avatars/${userId}/${Date.now()}-${file.name}`
  const { filePath } = await uploadFile(file, 'avatars', path)
  return getFileUrl('avatars', filePath)
}

/**
 * Upload knowledge document
 */
export async function uploadKnowledgeDocument(
  file: File,
  userId: string
): Promise<{ filePath: string; fileSize: number; mimeType: string }> {
  const path = `documents/${userId}/${Date.now()}-${file.name}`
  const { filePath } = await uploadFile(file, 'knowledge-documents', path)
  return {
    filePath,
    fileSize: file.size,
    mimeType: file.type,
  }
}

'use client'

import { useQuery, useMutation } from '@apollo/client/react'
import {
  GET_USER_AVATARS,
  GET_AVATAR_BY_ID,
  CREATE_AVATAR,
  UPDATE_AVATAR,
  DELETE_AVATAR,
  GET_USER_DOCUMENTS,
  CREATE_DOCUMENT,
  DELETE_DOCUMENT,
  LINK_DOCUMENT_TO_AVATAR,
  UNLINK_DOCUMENT_FROM_AVATAR,
  GET_USER_PROFILE,
  GET_USER_LICENSE,
} from './queries'
import { useUserId } from '@nhost/nextjs'
import type {
  Avatar,
  CreateAvatarInput,
  UpdateAvatarContentInput,
  CreateKnowledgeDocumentInput,
  Profile,
  License,
} from './types'

// Hook per ottenere gli avatar dell'utente
export function useUserAvatars() {
  const userId = useUserId()

  const { data, loading, error, refetch } = useQuery(GET_USER_AVATARS, {
    variables: { userId },
    skip: !userId,
  })

  return {
    avatars: ((data as { avatars?: Avatar[] })?.avatars || []) as Avatar[],
    loading,
    error,
    refetch,
  }
}

// Hook per ottenere un avatar specifico
export function useAvatar(avatarId: string | null) {
  const { data, loading, error, refetch } = useQuery(GET_AVATAR_BY_ID, {
    variables: { id: avatarId },
    skip: !avatarId,
  })

  return {
    avatar: (data as { avatars_by_pk?: Avatar | null })?.avatars_by_pk ?? null,
    loading,
    error,
    refetch,
  }
}

// Hook per creare un avatar
export function useCreateAvatar() {
  const [createAvatar, { loading, error }] = useMutation(CREATE_AVATAR)

  const create = async (input: CreateAvatarInput) => {
    const { data } = await createAvatar({
      variables: { object: input },
      refetchQueries: [GET_USER_AVATARS],
    })
    return (data as { insert_avatars_one?: Avatar })?.insert_avatars_one as Avatar
  }

  return { create, loading, error }
}

// Hook per aggiornare un avatar
export function useUpdateAvatar() {
  const [updateAvatar, { loading, error }] = useMutation(UPDATE_AVATAR)

  const update = async (id: string, changes: Partial<CreateAvatarInput>) => {
    const { data } = await updateAvatar({
      variables: { id, changes },
    })
    return (data as { update_avatars_by_pk?: Avatar })?.update_avatars_by_pk as Avatar
  }

  return { update, loading, error }
}

// Hook per eliminare un avatar
export function useDeleteAvatar() {
  const [deleteAvatar, { loading, error }] = useMutation(DELETE_AVATAR)

  const remove = async (id: string) => {
    await deleteAvatar({
      variables: { id },
      refetchQueries: [GET_USER_AVATARS],
    })
  }

  return { remove, loading, error }
}

// Hook per ottenere i documenti dell'utente
export function useUserDocuments() {
  const userId = useUserId()

  const { data, loading, error, refetch } = useQuery(GET_USER_DOCUMENTS, {
    variables: { userId },
    skip: !userId,
  })

  return {
    documents: ((data as { knowledge_documents?: unknown[] })?.knowledge_documents || []) as any[],
    loading,
    error,
    refetch,
  }
}

// Hook per ottenere il profilo utente
export function useUserProfile() {
  const userId = useUserId()

  const { data, loading, error } = useQuery(GET_USER_PROFILE, {
    variables: { userId },
    skip: !userId,
  })

  return {
    profile: (data as { profiles_by_pk?: Profile | null })?.profiles_by_pk ?? null,
    loading,
    error,
  }
}

// Hook per ottenere la licenza dell'utente
export function useUserLicense() {
  const userId = useUserId()
  const { profile } = useUserProfile()

  const { data, loading, error } = useQuery(GET_USER_LICENSE, {
    variables: { userId, schoolId: profile?.school_id },
    skip: !userId,
  })

  return {
    license: ((data as { licenses?: License[] })?.licenses?.[0] ?? null) as License | null,
    loading,
    error,
  }
}

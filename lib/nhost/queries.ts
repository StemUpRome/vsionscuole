// GraphQL queries and mutations for Nhost
import { gql } from 'graphql-tag'

export const GET_USER_AVATARS = gql`
  query GetUserAvatars($userId: uuid!) {
    avatars(where: { user_id: { _eq: $userId }, is_active: { _eq: true } }, order_by: { created_at: desc }) {
      id
      name
      image_url
      language
      voice
      temperature
      ai_model
      created_at
      updated_at
      avatar_content {
        description
        personality_openness
        personality_conscientiousness
        personality_extraversion
        personality_agreeableness
        personality_neuroticism
      }
    }
  }
`

export const GET_AVATAR_BY_ID = gql`
  query GetAvatarById($id: uuid!) {
    avatars_by_pk(id: $id) {
      id
      name
      image_url
      language
      voice
      temperature
      ai_model
      created_at
      updated_at
      avatar_content {
        id
        description
        personality_openness
        personality_conscientiousness
        personality_extraversion
        personality_agreeableness
        personality_neuroticism
      }
      avatar_knowledge_links {
        document {
          id
          name
          file_path
          file_size
          mime_type
          status
        }
      }
    }
  }
`

export const CREATE_AVATAR = gql`
  mutation CreateAvatar($object: avatars_insert_input!) {
    insert_avatars_one(object: $object) {
      id
      name
      image_url
      language
      voice
      temperature
      ai_model
      created_at
    }
  }
`

export const UPDATE_AVATAR = gql`
  mutation UpdateAvatar($id: uuid!, $changes: avatars_set_input!) {
    update_avatars_by_pk(pk_columns: { id: $id }, _set: $changes) {
      id
      name
      image_url
      language
      voice
      temperature
      ai_model
      updated_at
    }
  }
`

export const DELETE_AVATAR = gql`
  mutation DeleteAvatar($id: uuid!) {
    delete_avatars_by_pk(id: $id) {
      id
    }
  }
`

export const UPSERT_AVATAR_CONTENT = gql`
  mutation UpsertAvatarContent($object: avatar_contents_insert_input!) {
    insert_avatar_contents_one(
      object: $object
      on_conflict: { constraint: avatar_contents_avatar_id_key, update_columns: [description, personality_openness, personality_conscientiousness, personality_extraversion, personality_agreeableness, personality_neuroticism, updated_at] }
    ) {
      id
      description
      personality_openness
      personality_conscientiousness
      personality_extraversion
      personality_agreeableness
      personality_neuroticism
    }
  }
`

export const GET_USER_DOCUMENTS = gql`
  query GetUserDocuments($userId: uuid!) {
    knowledge_documents(
      where: { user_id: { _eq: $userId } }
      order_by: { created_at: desc }
    ) {
      id
      name
      file_path
      file_size
      mime_type
      status
      created_at
    }
  }
`

export const CREATE_DOCUMENT = gql`
  mutation CreateDocument($object: knowledge_documents_insert_input!) {
    insert_knowledge_documents_one(object: $object) {
      id
      name
      file_path
      file_size
      mime_type
      status
      created_at
    }
  }
`

export const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: uuid!) {
    delete_knowledge_documents_by_pk(id: $id) {
      id
    }
  }
`

export const LINK_DOCUMENT_TO_AVATAR = gql`
  mutation LinkDocumentToAvatar($avatarId: uuid!, $documentId: uuid!) {
    insert_avatar_knowledge_links_one(
      object: { avatar_id: $avatarId, document_id: $documentId }
    ) {
      id
    }
  }
`

export const UNLINK_DOCUMENT_FROM_AVATAR = gql`
  mutation UnlinkDocumentFromAvatar($avatarId: uuid!, $documentId: uuid!) {
    delete_avatar_knowledge_links(
      where: { avatar_id: { _eq: $avatarId }, document_id: { _eq: $documentId } }
    ) {
      affected_rows
    }
  }
`

export const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: uuid!) {
    profiles_by_pk(id: $userId) {
      id
      role
      school_id
      display_name
      school {
        id
        name
        code
      }
    }
  }
`

export const GET_USER_LICENSE = gql`
  query GetUserLicense($userId: uuid, $schoolId: uuid) {
    licenses(
      where: {
        _or: [
          { user_id: { _eq: $userId } }
          { school_id: { _eq: $schoolId } }
        ]
        is_active: { _eq: true }
      }
      order_by: { created_at: desc }
      limit: 1
    ) {
      id
      type
      max_avatars
      max_students
      max_storage_gb
      expires_at
      is_active
    }
  }
`

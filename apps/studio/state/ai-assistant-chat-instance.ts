import { Chat, type UIMessage as MessageType } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai'

import { constructHeaders } from '@/data/fetchers'
import { getQueryClient } from '@/data/query-client'
import { prepareMessagesForAPI } from '@/lib/ai/message-utils'
import {
  applyNotebookCacheEffects,
  collectNotebookCacheEffects,
} from '@/lib/ai/notebook-cache-invalidation'
import { BASE_PATH, IS_PLATFORM } from '@/lib/constants'
import { sanitizeForCloning, type AiAssistantState } from '@/state/ai-assistant-state'

/**
 * Constructs the AI-SDK-backed chat instance for a chat session.
 *
 * This lives in its own module — loaded via dynamic import from
 * `ai-assistant-state.tsx` — because it is the only chat-state code that needs
 * the AI SDK at runtime. Keeping the SDK (and its transitive schema/tooling
 * dependencies, ~140KB gzip) out of the state module keeps it out of the
 * shared bundle of every page; it only downloads once a chat instance is
 * actually needed.
 */
export function createChatInstance(
  state: AiAssistantState,
  options: { id: string; initialMessages: MessageType[] }
) {
  // Seeded so effects already reflected in persisted history aren't replayed on the first
  // onFinish after a reload.
  const processedNotebookToolCallIds = new Set<string>(
    collectNotebookCacheEffects(options.initialMessages, new Set()).map(
      (effect) => effect.toolCallId
    )
  )

  // The project a pending request's tool calls actually ran against — captured when the
  // request is sent, not re-read from (mutable) state.context in onFinish, since the user
  // can switch projects while the request is still in flight.
  let requestProjectRef: string | undefined

  return new Chat<MessageType>({
    id: options.id,
    messages: options.initialMessages.map((message) => sanitizeForCloning(message)),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    transport: new DefaultChatTransport({
      api: `${BASE_PATH}/api/ai/sql/generate-v4`,
      fetch: async (url, init) => {
        const response = await globalThis.fetch(url as RequestInfo, init)
        const spanId = response.headers.get('x-braintrust-span-id')
        if (spanId) {
          state.pendingSpanIds[options.id] = spanId
        }
        return response
      },
      async prepareSendMessagesRequest({ messages, ...opts }) {
        const cleanedMessages = prepareMessagesForAPI(messages)
        const headerData = await constructHeaders()
        const authorizationHeader = headerData.get('Authorization')

        // Get the chat specific to this request to ensure we have the correct name
        const chat = state.chats[options.id]

        requestProjectRef = state.context.projectRef

        return {
          ...opts,
          body: {
            messages: cleanedMessages,
            projectRef: state.context.projectRef,
            connectionString: state.context.connectionString,
            chatId: options.id,
            chatName: chat?.name,
            supportMode: chat?.supportMetadata?.isSupportChat ?? false,
            orgSlug: state.context.orgSlug,
            context: state.context,
            model: state.model,
            ...opts.body,
          },
          ...(IS_PLATFORM ? { headers: { Authorization: authorizationHeader ?? '' } } : {}),
        }
      },
    }),
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) {
        return
      }

      if (toolCall.toolName === 'escalate_to_human') {
        state.setSupportLifecycleStatus(options.id, 'escalated')
        return
      }

      if (toolCall.toolName === 'resolve_support_conversation') {
        state.setSupportLifecycleStatus(options.id, 'bot_resolved')
        return
      }

      if (toolCall.toolName === 'rename_chat') {
        const { newName } = toolCall.input as { newName: string }

        if (options.id && newName?.trim()) {
          state.renameChat(options.id, newName.trim())
        }
      }
    },
    onFinish(_result) {
      // Sync messages back to state
      const chatInstance = state.chatInstances[options.id]
      if (chatInstance) {
        const messages = chatInstance.messages
        const chat = state.chats[options.id]
        if (chat) {
          // Clone first — valtio's proxy() mutates nested properties in place and would corrupt the SDK's live array
          chat.messages = messages.map((message) => sanitizeForCloning(message))
          chat.updatedAt = new Date()
        }

        // Associate pending span ID with the last assistant message
        const pendingSpanId = state.pendingSpanIds[options.id]
        if (pendingSpanId) {
          const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant')
          if (lastAssistantMsg) {
            state.messageSpanIds[lastAssistantMsg.id] = pendingSpanId
          }
          delete state.pendingSpanIds[options.id]
        }

        // Sync support chat messages to Front (fire-and-forget, dynamic import to avoid SSR issues)
        if (chat?.supportMetadata) {
          import('@/state/ai-chat-front-sync')
            .then(({ syncSupportChatToFront }) => syncSupportChatToFront(options.id, state))
            .catch(() => {})
        }

        const projectRef = requestProjectRef
        if (projectRef) {
          const effects = collectNotebookCacheEffects(messages, processedNotebookToolCallIds)
          effects.forEach((effect) => processedNotebookToolCallIds.add(effect.toolCallId))
          if (effects.length > 0) {
            void applyNotebookCacheEffects({ queryClient: getQueryClient(), projectRef, effects })
          }
        }
      }
    },
  })
}

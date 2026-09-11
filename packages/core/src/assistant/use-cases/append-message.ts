import type { Message } from '../conversation'
import type { AppendMessageInput, MessageRepository } from '../ports'

export const appendMessage = (
  input: AppendMessageInput,
  repository: MessageRepository,
): Promise<Message> => repository.append(input)

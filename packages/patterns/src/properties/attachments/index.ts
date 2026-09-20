export { AttachmentProperty, type AttachmentPropertyProps } from './attachment-property'
// Only the type is public: it names the attachment's `type` prop. The icon and the
// catalog stay internal to the package, as in the other closed-catalog properties.
export type { AttachmentType } from './attachment-type'
export {
  AttachmentsProperty,
  type AttachmentsPropertyAction,
  type AttachmentsPropertyProps,
} from './attachments-property'

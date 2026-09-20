export function copyToClipboard(value: string): Promise<void> | undefined {
  return navigator.clipboard?.writeText(value)
}

export function canUseFileShare(nav: Navigator, file: File): boolean {
  return (
    typeof nav.canShare === 'function' &&
    typeof nav.share === 'function' &&
    nav.canShare({ files: [file] })
  )
}

/**
 * Share the PNG via the Web Share API when files are supported, otherwise
 * trigger a download. Returns which path was taken. A user-cancelled share
 * sheet (AbortError) is treated as a successful no-op, not an error.
 */
export async function shareOrDownloadImage(
  blob: Blob,
  filename: string,
  meta: { title: string; text: string }
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' })

  if (canUseFileShare(navigator, file)) {
    try {
      await navigator.share({ files: [file], title: meta.title, text: meta.text })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'shared'
      }
      throw err
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return 'downloaded'
}

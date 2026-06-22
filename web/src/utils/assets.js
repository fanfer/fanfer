export function assetUrl(value) {
  if (!value) return ''
  if (/^(https?:)?\/\//.test(value) || value.startsWith('data:')) return value
  if (value.startsWith('/')) return value
  return `/assets/${value}`
}

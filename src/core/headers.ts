export function acceptLanguage(languages: string[]): string {
  if (languages.length === 0) return ''
  return languages
    .map((lang, i) => (i === 0 ? lang : `${lang};q=${(1 - i * 0.1).toFixed(1)}`))
    .join(',')
}

export function secChUa(brands: { brand: string; version: string }[]): string {
  return brands.map((b) => `"${b.brand}";v="${b.version}"`).join(', ')
}

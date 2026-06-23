import { useEffect } from 'react'

interface SeoInput {
  title?: string
  description?: string | null
  image?: string | null
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * Lightweight SPA SEO: sets document title + description + Open Graph tags for
 * the current page, restoring the previous title on unmount.
 * (For crawler-grade SEO, pair with SSR/prerender — see docs/tech-stack.txt.)
 */
export function useSeo({ title, description, image }: SeoInput) {
  useEffect(() => {
    const prevTitle = document.title
    if (title) {
      document.title = title
      setMeta('property', 'og:title', title)
    }
    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
    }
    if (image) setMeta('property', 'og:image', image)
    return () => {
      document.title = prevTitle
    }
  }, [title, description, image])
}

import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '@/lib/utils/sanitize'

describe('sanitizeHtml', () => {
  it('strips HTML tags', () => {
    expect(sanitizeHtml('<b>bold</b> text')).toBe('bold text')
  })

  it('strips script tags and their contents', () => {
    expect(sanitizeHtml('hello<script>alert("xss")</script>world')).toBe('helloworld')
  })

  it('strips multi-line script blocks', () => {
    const input = 'before<script>\nalert(1)\n</script>after'
    expect(sanitizeHtml(input)).toBe('beforeafter')
  })

  it('removes javascript: URIs', () => {
    expect(sanitizeHtml('javascript:alert(1)')).toBe('alert(1)')
  })

  it('removes javascript: URIs case-insensitively', () => {
    expect(sanitizeHtml('JavaScript:alert(1)')).toBe('alert(1)')
  })

  it('escapes ampersand', () => {
    expect(sanitizeHtml('A & B')).toBe('A &amp; B')
  })

  it('escapes less-than and greater-than', () => {
    expect(sanitizeHtml('a < b > c')).toBe('a &lt; b &gt; c')
  })

  it('escapes double quotes', () => {
    expect(sanitizeHtml('say "hello"')).toBe('say &quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(sanitizeHtml("it's")).toBe('it&#x27;s')
  })

  it('preserves normal text without modification', () => {
    expect(sanitizeHtml('Normal text 123')).toBe('Normal text 123')
  })

  it('handles empty string', () => {
    expect(sanitizeHtml('')).toBe('')
  })

  it('trims whitespace from result', () => {
    expect(sanitizeHtml('  hello  ')).toBe('hello')
  })

  it('strips style tags and their contents', () => {
    expect(sanitizeHtml('text<style>body{color:red}</style>more')).toBe('textmore')
  })
})

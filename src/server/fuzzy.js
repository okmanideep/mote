/**
* Ranking helpers for note search.
*
* Filename matches always rank above matches inside note contents, mirroring
* how an editor's `find_files` picker (Telescope + fzf-native) ranks paths:
*
* 1. filename term matches, where `-`, `_`, `.`, and `/` behave like spaces
* 2. filename fuzzy matches, scored like fzf v2 (consecutive runs and
*    word-boundary/camelCase starts score higher, gaps are penalized)
* 3. content substring matches
* 4. content fuzzy matches
*/

// The tiers are far apart so a filename match never loses to a content match
const FILENAME_SCORE = 1_000_000
const CONTENT_SCORE = 0

const MATCH = 16            // fzf: scoreMatch
const GAP_START = -3        // fzf: scoreGapStart
const GAP_EXTENSION = -1    // fzf: scoreGapExtension
const BONUS_BOUNDARY = 8    // fzf: bonusBoundary
const BONUS_CONSECUTIVE = 4 // fzf: bonusConsecutive
const BONUS_CAMEL = 7       // fzf: bonusCamel123
const BONUS_FIRST_CHAR = 2  // fzf: bonusFirstCharMultiplier
const NEGATIVE = -1e9

const SEPARATORS = new Set([
  ' ', '\t', '\n', '-', '_', '/', '\\', '.', ':', ',', ';', '=', '+', '*',
  '&', '^', '%', '$', '#', '@', '!', '?', '|', '<', '>', '~', '(', ')', '[',
  ']', '{', '}', "'", '"', '`'
])

/**
* Matches a relative note name, scoring exact/substring hits above fuzzy ones.
* Returns `{ score, matches }` where matches are ranges in `name`, or null.
*/
export function matchFilename(name, query) {
  const normalized = normalize(name)
  const needle = normalizeQuery(query)
  if (!needle.text) return null

  const index = normalized.text.indexOf(needle.text)
  if (index !== -1) {
    return { score: FILENAME_SCORE + substringQuality(name, normalized, index, needle.text), matches: rangesFor(normalized, index, needle.text.length) }
  }

  const fuzzy = fuzzyMatch(name, query)
  if (!fuzzy) return null
  // Reject scattered hits such as `tvod` matching `the-value-of-values.md`
  if (!isCompactMatch(name, fuzzy.matches)) return null
  return { score: FILENAME_SCORE + Math.min(699, 100 + fuzzy.score), matches: fuzzy.matches }
}

/**
* Matches note contents, preferring literal substring hits over fuzzy ones.
* Returns `{ score, index }` or null; `index` is the substring position if any.
*/
export function matchContent(text, query) {
  const haystack = text.toLocaleLowerCase()
  const needle = String(query).trim().toLocaleLowerCase()
  if (!needle) return null

  const index = haystack.indexOf(needle)
  if (index !== -1) {
    return { score: CONTENT_SCORE + 400 + needle.length, index }
  }

  const score = subsequenceScore(haystack, needle)
  return score === null ? null : { score: CONTENT_SCORE + score, index: -1 }
}

/**
* fzf v2 style fuzzy match. Rewards consecutive characters, word-boundary and
* camelCase starts, and penalizes gaps; returns the best alignment's score and
* the matched character ranges in `text`, or null when it is not a subsequence.
*/
export function fuzzyMatch(text, query) {
  const needle = String(query).toLocaleLowerCase()
  const haystack = text.toLocaleLowerCase()
  const n = haystack.length
  const m = needle.length
  if (!m) return { score: 0, matches: [] }
  if (m > n) return null

  const previous = new Float64Array(n).fill(NEGATIVE)
  const current = new Float64Array(n).fill(NEGATIVE)
  const parents = Array.from({ length: m }, () => new Int32Array(n).fill(-1))

  for (let i = 0; i < m; i++) {
    current.fill(NEGATIVE)
    let bestGap = NEGATIVE     // max of previous[k] + k over k <= j - 2
    let bestGapIndex = -1

    for (let j = 0; j < n; j++) {
      if (i > 0 && j >= 2) {
        const k = j - 2
        if (previous[k] > NEGATIVE && previous[k] + k > bestGap) {
          bestGap = previous[k] + k
          bestGapIndex = k
        }
      }
      if (haystack[j] !== needle[i]) continue

      const bonus = bonusAt(text, j)
      if (i === 0) {
        current[j] = MATCH + bonus * BONUS_FIRST_CHAR
        continue
      }

      let best = NEGATIVE
      let from = -1
      if (previous[j - 1] > NEGATIVE) {
        // Consecutive characters keep at least the consecutive bonus
        best = previous[j - 1] + MATCH + Math.max(bonus, BONUS_CONSECUTIVE)
        from = j - 1
      }
      if (bestGap > NEGATIVE) {
        // Gap of (j - k - 1) characters costs GAP_START + GAP_EXTENSION each;
        // `bestGap` already holds the maximal previous[k] + k term
        const value = bestGap + (GAP_START - GAP_EXTENSION) - j + MATCH + bonus
        if (value > best) {
          best = value
          from = bestGapIndex
        }
      }
      current[j] = best
      parents[i][j] = from
    }

    previous.set(current)
  }

  let best = NEGATIVE
  let bestIndex = -1
  for (let j = 0; j < n; j++) {
    if (previous[j] > best) {
      best = previous[j]
      bestIndex = j
    }
  }
  if (bestIndex === -1 || best <= NEGATIVE) return null

  const matches = []
  for (let i = m - 1, j = bestIndex; i >= 0; i--) {
    matches.unshift({ start: j, end: j + 1 })
    j = parents[i][j]
  }

  return { score: best, matches }
}

/**
* Lowercases a name and treats path/filename separators as spaces so that
* queries like `apple hsi` match `apple-hsi-app-sunset.md`.
*/
export function normalize(name) {
  const text = []
  const original = []
  let pendingSpace = false
  for (let index = 0; index < name.length; index++) {
    const character = name[index]
    if (SEPARATORS.has(character)) {
      pendingSpace = text.length > 0
      continue
    }
    if (pendingSpace) {
      text.push(' ')
      original.push(-1)
      pendingSpace = false
    }
    text.push(character.toLocaleLowerCase())
    original.push(index)
  }
  return { text: text.join(''), original }
}

function normalizeQuery(query) {
  return { text: String(query).trim().toLocaleLowerCase().split(/[\s\-_./\\]+/).filter(Boolean).join(' ') }
}

function rangesFor(normalized, start, length) {
  const ranges = []
  for (let index = start; index < start + length; index++) {
    const original = normalized.original[index]
    if (original === -1) continue
    const last = ranges[ranges.length - 1]
    if (last && last.end === original) last.end = original + 1
    else ranges.push({ start: original, end: original + 1 })
  }
  return ranges
}

function substringQuality(name, normalized, index, needle) {
  const start = normalized.original[index]
  const end = normalized.original[index + needle.length - 1] + 1
  const lowerName = name.toLocaleLowerCase()
  const basenameStart = lowerName.lastIndexOf('/') + 1
  const extensionless = lowerName.slice(basenameStart).replace(/\.[^.\s]+$/, '')

  if (normalized.text === needle || extensionless === needle) return 1000
  if (start >= basenameStart) {
    if (start === basenameStart) return 950
    if (extensionless.startsWith(needle)) return 900
    return 850
  }
  // Directory names rank below every basename hit
  if (start === 0 || name[start - 1] === '/') return 800
  if (end === name.length) return 750
  return 700
}

/**
* A fuzzy filename match must be compact, like fzf's gap penalties in practice:
* characters matched at word boundaries may spread out (acronyms such as
* `jhs` in `jiostar-hsi-...`), while free-form hits must stay close together.
*/
function isCompactMatch(text, matches) {
  const span = matches[matches.length - 1].end - matches[0].start
  let wellPlaced = 0
  for (let index = 0; index < matches.length; index++) {
    const consecutive = index > 0 && matches[index - 1].end === matches[index].start
    if (consecutive || bonusAt(text, matches[index].start) > 0) wellPlaced++
  }
  const limit = wellPlaced === matches.length ? matches.length * 4 + 8 : matches.length * 2 + 2
  return span <= Math.max(8, limit)
}

function bonusAt(text, index) {
  if (index === 0) return BONUS_BOUNDARY
  const previous = text[index - 1]
  const current = text[index]
  if (SEPARATORS.has(previous)) return BONUS_BOUNDARY
  if (isDigit(previous) !== isDigit(current) && (isLetter(previous) || isLetter(current))) return BONUS_CAMEL
  if (isLower(previous) && isUpper(current)) return BONUS_CAMEL
  return 0
}

// Greedy subsequence scoring, cheap enough for whole note contents
function subsequenceScore(haystack, needle) {
  let score = 0
  let cursor = 0
  let previous = -2
  for (const character of needle) {
    const index = haystack.indexOf(character, cursor)
    if (index === -1) return null
    score += (previous === index - 1 ? 10 : 1) - Math.min(index - cursor, 20) / 20
    previous = index
    cursor = index + 1
  }
  return score
}

function isDigit(character) {
  return character >= '0' && character <= '9'
}

function isLetter(character) {
  return character.toLocaleLowerCase() !== character.toLocaleUpperCase()
}

function isLower(character) {
  return isLetter(character) && character === character.toLocaleLowerCase()
}

function isUpper(character) {
  return isLetter(character) && character === character.toLocaleUpperCase()
}
